import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import UserAvatar from './UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

function PostList({ posts, onPostUpdated }) {
  const [usernames, setUsernames] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const userIds = [...new Set(posts.map(post => post.user_id))];
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (!error && data) {
          const usernameMap = {};
          data.forEach(profile => {
            usernameMap[profile.id] = profile.username;
          });
          setUsernames(usernameMap);
        }
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        const { data: likedData, error: likedError } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', currentUser.id);

        if (!likedError && likedData) {
          const likedMap = {};
          likedData.forEach(like => {
            likedMap[like.post_id] = true;
          });
          setLikedPosts(likedMap);
        }
      }
    };

    fetchInitialData();
  }, [posts]);

  const handleLike = async (postId, currentLikes) => {
    try {
      if (!user) return;

      const isLiked = likedPosts[postId];
      const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;

      const { data, error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId)
        .select();
      
      if (error) throw error;

      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ 
            post_id: postId, 
            user_id: user.id 
          });
      }

      setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
      if (onPostUpdated) onPostUpdated(data[0]);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="post-list">
      {posts.length === 0 ? (
        <div className="no-posts">No posts found. Be the first to post about Pokémon GO!</div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <Link to={`/profile/${post.user_id}`} className="post-user-info">
                <UserAvatar userId={post.user_id} size={40} />
                <div className="post-user-details">
                  <span className="post-username">{usernames[post.user_id] || 'Trainer'}</span>
                  <span className="post-time">
                    {formatDistanceToNow(new Date(post.created_at + 'Z'), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            </div>

            <div className="post-content">
              {post.title && <h3 className="post-title">{post.title}</h3>}
              {post.content && <p className="post-text">{post.content}</p>}
              {post.image_url && (
                <div className="post-image-container">
                  <img src={post.image_url} alt={post.title} className="post-image" />
                </div>
              )}
            </div>

            <div className="engagement-metrics">
              <span className="likes-count">{post.likes || 0} {post.likes === 1 ? 'like' : 'likes'}</span>
              <span className="comments-count">{post.comments || 0} {post.comments === 1 ? 'comment' : 'comments'}</span>
            </div>

            <div className="post-footer">
              <button 
                onClick={() => handleLike(post.id, post.likes || 0)} 
                className="post-action"
                style={{ color: likedPosts[post.id] ? '#3d7dca' : 'inherit' }}
                disabled={!user}
                title={!user ? "Login to like posts" : ""}
              >
                <span className="post-action-icon">👍🏻</span>
                <span className="post-action-text">Like</span>
              </button>
              <Link to={`/posts/${post.id}`} className="post-action">
                <span className="post-action-icon">💬</span>
                <span className="post-action-text">Comment</span>
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default PostList