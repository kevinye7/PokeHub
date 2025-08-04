import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import UserAvatar from './UserAvatar'
import { Link } from 'react-router-dom'

export default function Comment({ comment }) {
  const [username, setUsername] = useState('Trainer')

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', comment.user_id)
          .maybeSingle()
        
        if (error) throw error
        
        setUsername(data?.username || 'Trainer')
      } catch (error) {
        console.error('Error fetching username:', error)
        setUsername('Trainer')
      }
    }

    fetchUsername()
  }, [comment.user_id])

  return (
    <div className="comment">
      <div className="comment-header">
        <Link to={`/profile/${comment.user_id}`} className="comment-author">
          <UserAvatar userId={comment.user_id} size={32} />
          <span>{username}</span>
        </Link>
        <span className="comment-date">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <div className="comment-content">{comment.content}</div>
    </div>
  )
}