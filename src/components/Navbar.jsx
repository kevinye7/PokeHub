import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useState, useEffect, useRef } from 'react'
import UserAvatar from './UserAvatar'
import AuthModal from './AuthModal'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Check current user on load
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowDropdown(false)
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <h1>PokéHub</h1>
        </Link>
        
        {user ? (
          <div className="user-menu-container" ref={dropdownRef}>
            <button 
              className="avatar-button" 
              onClick={toggleDropdown}
              aria-label="User menu"
            >
              <UserAvatar userId={user.id} size={40} />
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                <Link 
                  to={`/profile/${user.id}`} 
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  Profile
                </Link>
                {/* <Link 
                  to="/settings" 
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  Settings
                </Link> */}
                <button 
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="auth-btn" 
            onClick={() => setShowAuthModal(true)}
            aria-label="Login"
          >
            Login
          </button>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </nav>
  )
}