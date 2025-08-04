import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Comment from '../components/Comment'
import UserAvatar from '../components/UserAvatar'
import { formatDistanceToNow } from 'date-fns'

export default function PostDetail({ onPostUpdated }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    image_url: ''
  })
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('Trainer')
  const [hasLiked, setHasLiked] = useState(false)

  useEffect(() => {
    fetchPost()
    fetchComments()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchUsername(user.id)
        checkIfLiked(user.id)
      }
    })
  }, [id])

  const fetchUsername = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUsername(data?.username || 'Trainer')
    } catch (error) {
      console.error('Error fetching username:', error)
    }
  }

  const checkIfLiked = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select()
        .eq('post_id', id)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      setHasLiked(!!data)
    } catch (error) {
      console.error('Error checking like status:', error)
    }
  }

  async function fetchPost() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      setError('Post not found')
    } else {
      setPost(data)
      setEditData({
        title: data.title,
        content: data.content || '',
        image_url: data.image_url || ''
      })
    }
    setIsLoading(false)
  }

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
    } else {
      setComments(data)
    }
  }

  async function handleUpvote() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newLikes = hasLiked ? post.likes - 1 : post.likes + 1
      
      // First update the likes count in posts table
      const { data, error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', id)
        .select()

      if (error) throw error

      // Then update the junction table
      if (hasLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('post_likes')
          .insert({ 
            post_id: id, 
            user_id: user.id 
          })
      }

      // Update local state
      setPost(prev => ({
        ...prev,
        likes: newLikes
      }))
      setHasLiked(!hasLiked)
      
      // Notify parent component of the update
      if (onPostUpdated) onPostUpdated(data[0])
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('You need to be logged in to comment')
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([{ 
          post_id: id, 
          content: newComment,
          user_id: user.id 
        }])
        .select()

      if (error) throw error

      setComments([data[0], ...comments])
      setNewComment('')
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleUpdatePost(e) {
    e.preventDefault()
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user || user.id !== post.user_id) {
        throw new Error('You can only edit your own posts')
      }

      const { data, error } = await supabase
        .from('posts')
        .update(editData)
        .eq('id', id)
        .select()

      if (error) throw error

      setPost(data[0])
      setIsEditing(false)
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleDeletePost() {
    if (window.confirm('Are you sure you want to delete this Pokémon GO post?')) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user || user.id !== post.user_id) {
          throw new Error('You can only delete your own posts')
        }

        const { error } = await supabase.from('posts').delete().eq('id', id)

        if (error) throw error

        navigate('/')
      } catch (error) {
        setError(error.message)
      }
    }
  }

  if (isLoading) return <div className="loading">Loading...</div>
  if (!post) return <div className="error">{error || 'Post not found'}</div>

  return (
    <div className="post-detail-container">
      {error && <div className="error-message">{error}</div>}
      
      {isEditing ? (
        <form onSubmit={handleUpdatePost} className="edit-post-form">
          <div className="form-group">
            <label>Title*</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({...editData, title: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={editData.content}
              onChange={(e) => setEditData({...editData, content: e.target.value})}
              rows="5"
            />
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input
              type="url"
              value={editData.image_url}
              onChange={(e) => setEditData({...editData, image_url: e.target.value})}
            />
          </div>
          <div className="form-actions">
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="post-with-comments">
          <div className="post-content">
            <div className="post-header">
              <Link to={`/profile/${post.user_id}`} className="post-user-info">
                <UserAvatar userId={post.user_id} size={40} />
                <div className="post-user-details">
                  <span className="post-username">{username}</span>
                  <span className="post-time">
                    {formatDistanceToNow(new Date(post.created_at + 'Z'), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            </div>

            <div className="post-body">
              {post.title && <h2 className="post-title">{post.title}</h2>}
              {post.content && <p className="post-text">{post.content}</p>}
              {post.image_url && (
                <div className="post-image-container">
                  <img src={post.image_url} alt={post.title} className="post-image" />
                </div>
              )}
            </div>

            <div className="engagement-metrics">
              <span className="likes-count">{post.likes || 0} likes</span>
              <span className="comments-count">{comments.length} comments</span>
            </div>

            <div className="post-actions">
              <button 
                onClick={handleUpvote} 
                className="action-button"
                style={{ color: hasLiked ? '#3d7dca' : 'inherit' }}
              >
                <span className="action-icon">👍</span>
                <span className="action-text">Like</span>
              </button>
              <button className="action-button">
                <span className="action-icon">💬</span>
                <span className="action-text">Comment</span>
              </button>
            </div>
          </div>

          <div className="comments-section">
            <div className="comments-header">
              <h4>Comments</h4>
            </div>

            {user ? (
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <UserAvatar userId={user.id} size={32} />
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows="1"
                  required
                />
                <button type="submit">Post</button>
              </form>
            ) : (
              <p className="login-prompt">
                <button onClick={() => navigate('/')}>Login</button> to post comments
              </p>
            )}

            <div className="comments-list">
              {comments.length === 0 ? (
                <p>No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <Comment key={comment.id} comment={comment} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {user?.id === post.user_id && !isEditing && (
        <div className="post-management-actions">
          <button onClick={() => setIsEditing(true)}>Edit Post</button>
          <button onClick={handleDeletePost} className="delete-btn">
            Delete Post
          </button>
        </div>
      )}
    </div>
  )
}