import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailSent(false);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose(); // Close modal on successful login
      } else {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('This email is already registered. Please login instead.');
          }
          throw signUpError;
        }

        if (user?.identities?.length === 0) {
          setEmailSent(true);
          return;
        }

        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              username: user.email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (profileError) throw profileError;
          onClose();
        }
      }
    } catch (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-modal-overlay">
        <div className="auth-modal">
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
          <h2>Confirm Your Email</h2>
          <div className="success-message">
            <p>We've sent a confirmation link to <strong>{email}</strong>.</p>
            <p>Please check your inbox to complete registration.</p>
          </div>
          <button 
            className="resend-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Resend Email'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        
        {error && (
          <div className="error-message">
            {error}
            {error.includes('already has an account') && (
              <button 
                type="button" 
                onClick={() => setMode('login')}
                className="switch-mode-btn"
              >
                Switch to Login
              </button>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-switch">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => {
                setMode('signup');
                setError('');
              }}>
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => {
                setMode('login');
                setError('');
              }}>
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}