import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import PostList from '../components/PostList'
import CreatePost from '../components/CreatePost'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchPosts()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [sortBy])

  async function fetchPosts() {
    let query = supabase
      .from('posts')
      .select(`*, comments:comments(count)`)
      .order(sortBy, { ascending: sortBy === 'created_at' ? false : true })

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
    } else {
      const postsWithCounts = data.map(post => ({
        ...post,
        comment_count: post.comments[0]?.count || 0
      }))
      setPosts(postsWithCounts)
    }
  }

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts])
  }

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? { ...post, likes: updatedPost.likes } : post
    ))
  }

  return (
    <div className="home">
      <div className="controls">
        <div className="search-sort">
          <input
            type="text"
            placeholder="Search Pokémon GO posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && fetchPosts()}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at">Newest First</option>
            <option value="likes">Most Likes</option>
          </select>
          <button onClick={fetchPosts}>Apply</button>
        </div>
      </div>

      {user && <CreatePost onPostCreated={handlePostCreated} />}

      <PostList posts={posts} onPostUpdated={handlePostUpdated} />
    </div>
  )
}