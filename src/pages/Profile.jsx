import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PostList from '../components/PostList';
import UserAvatar from '../components/UserAvatar';

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    avatarFile: null
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        let profileData = null;

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;

        profileData = data;
        
        if (!profileData) {
          // If still no profile, create a basic one
          const { error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              username: currentUser?.email?.split('@')[0] || 'trainer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) throw createError;
          
          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          profileData = newProfile;
        }

        // Check if viewing own profile
        setIsCurrentUser(currentUser?.id === userId);

        // Fetch user's posts with comment counts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*, comments:comments(count)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // Add comment_count to each post
        const postsWithCounts = postsData.map(post => ({
          ...post,
          comments: post.comments[0]?.count || 0
        }));

        setProfile(profileData);
        setPosts(postsWithCounts);
        setFormData({
          username: profileData.username || '',
          avatarFile: null
        });
      } catch (error) {
        console.error('Profile load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload new avatar if selected
      if (formData.avatarFile) {
        const fileExt = formData.avatarFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(filePath, formData.avatarFile);

        if (uploadError) throw uploadError;

        avatarUrl = filePath;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Refresh profile data
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(data);
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? { ...post, likes: updatedPost.likes } : post
    ));
  };

  if (isLoading) {
    return (
      <div className="loading">
        <p>Loading profile...</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="avatar-container">
          <UserAvatar userId={userId} size={120} />
        </div>
        
        {editing ? (
          <form onSubmit={handleUpdateProfile} className="profile-edit-form">
            <div className="form-group">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Trainer name"
                required
                className="clean-input"
              />
            </div>
            <div className="form-group">
              <label className="avatar-upload-label">
                <span>Change Avatar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({...formData, avatarFile: e.target.files[0]})}
                  className="hidden-file-input"
                />
              </label>
              {formData.avatarFile && (
                <p className="file-selected">{formData.avatarFile.name}</p>
              )}
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setEditing(false)} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <h2>{profile?.username || 'Pokémon Trainer'}</h2>
            <p>Member since {new Date(profile?.created_at).toLocaleDateString()}</p>
            {isCurrentUser && (
              <button onClick={() => setEditing(true)} className="edit-profile-btn">
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      <div className="user-posts">
        {posts.length > 0 ? (
          <PostList posts={posts} onPostUpdated={handlePostUpdated} />
        ) : (
          <p className="no-posts-message">No posts yet.</p>
        )}
      </div>
    </div>
  );
}