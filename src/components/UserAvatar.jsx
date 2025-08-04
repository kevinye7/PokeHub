import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function UserAvatar({ userId, size = 32 }) {
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [username, setUsername] = useState('Trainer')

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error('Error fetching profile:', error)
          return
        }
        
        setUsername(data?.username || 'Trainer')
        
        if (data?.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(data.avatar_url)
          setAvatarUrl(publicUrl)
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error)
      }
    }

    fetchProfile()
  }, [userId])

  return (
    <div className="user-avatar" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={username} 
          className="avatar-image"
          style={{ width: size, height: size }}
        />
      ) : (
        <div className="avatar-fallback" style={{ width: size, height: size }}>
          {username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}