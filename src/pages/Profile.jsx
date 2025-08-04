import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PostList from '../components/PostList';
import UserAvatar from '../components/UserAvatar';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    avatarFile: null
  });

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? { ...post, likes: updatedPost.likes } : post
    ));
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        // Try fetching profile with retry logic
        let profileData = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && !profileData) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (profileError) throw profileError;
          
          if (data) {
            profileData = data;
          } else {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

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

        // Fetch user's posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        setProfile(profileData);
        setPosts(postsData);
        setFormData({
          username: profileData.username || '',
          avatarFile: null
        });
      } catch (error) {
        setError(error.message);
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
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <p>Loading profile...</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="refresh-btn">
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {error && <div className="error-message">{error}</div>}
      
      <div className="profile-header">
        <div className="avatar-container">
          <UserAvatar userId={userId} size={120} />
        </div>
        
        {editing ? (
          <form onSubmit={handleUpdateProfile} className="profile-edit-form">
            <div className="form-group">
              <label>Trainer Name</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({...formData, avatarFile: e.target.files[0]})}
              />
            </div>
            <div className="form-actions">
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
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
          <p>No posts yet.</p>
        )}
      </div>
    </div>
  );
}