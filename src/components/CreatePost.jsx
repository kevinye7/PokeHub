import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import AuthModal from './AuthModal';

export default function CreatePost({ onPostCreated }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('Trainer');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        if (!user) return;
        
        setUser(user);

        // Fetch username from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Fallback to email if profile fetch fails
          setUsername(user.email?.split('@')[0] || 'Trainer');
          return;
        }

        setUsername(profile?.username || user.email?.split('@')[0] || 'Trainer');
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUsername('Trainer');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('You need to be logged in to create a post');
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
          title, 
          content, 
          image_url: imageUrl,
          user_id: user.id,
          likes: 0,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      onPostCreated(data[0]);
      setTitle('');
      setContent('');
      setImageUrl('');
      setShowModal(false);
    } catch (error) {
      setError(error.message);
      if (error.message.includes('logged in')) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="create-post-prompt">
        <div className="user-avatar-container">
          <UserAvatar userId={null} size={40} />
        </div>
        <div 
          className="post-input-trigger"
          onClick={() => setShowModal(true)}
        >
          What's on your mind, Trainer?
        </div>
        <div className="post-options">
          <button className="post-option" onClick={() => setShowModal(true)}>
            <span className="icon">🎥</span> Live video
          </button>
          <button className="post-option" onClick={() => setShowModal(true)}>
            <span className="icon">📷</span> Photo/video
          </button>
          <button className="post-option" onClick={() => setShowModal(true)}>
            <span className="icon">😊</span> Feeling/activity
          </button>
        </div>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="create-post-prompt">
        <Link to={`/profile/${user.id}`} className="user-avatar-container">
          <UserAvatar userId={user.id} size={40} />
        </Link>
        <div 
          className="post-input-trigger"
          onClick={() => setShowModal(true)}
        >
          What's on your mind, {username}?
        </div>
        <div className="post-options">
          <button className="post-option">
            <span className="icon">🎥</span> Live video
          </button>
          <button className="post-option">
            <span className="icon">📷</span> Photo/video
          </button>
          <button className="post-option">
            <span className="icon">😊</span> Feeling/activity
          </button>
        </div>
      </div>

      {showModal && (
        <div className="create-post-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Post</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <Link to={`/profile/${user.id}`} className="modal-user-info">
              <UserAvatar userId={user.id} size={40} />
              <span>{username}</span>
            </Link>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (required)"
                  required
                  className="modal-title-input"
                />
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows="5"
                className="modal-textarea"
              />
              <div className="form-group">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="modal-image-input"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="post-submit-btn"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}