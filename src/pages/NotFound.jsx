import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="home-link">
        Go back to the PokéForum home page
      </Link>
    </div>
  )
}