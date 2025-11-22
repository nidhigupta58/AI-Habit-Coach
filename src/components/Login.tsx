import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'reset';

export const Login = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6 && mode !== 'reset') {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password);
        setSuccess('Account created! Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => setMode('signin'), 3000);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
        setEmail('');
        setTimeout(() => setMode('signin'), 3000);
      }
    } catch (err: any) {
      const errorMessage = err?.code 
        ? err.code.replace('auth/', '').replace(/-/g, ' ')
        : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const errorMessage = err?.code 
        ? err.code.replace('auth/', '').replace(/-/g, ' ')
        : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            AI Habit Coach
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your habits, monitor your mood, and grow every day.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '2rem',
          backgroundColor: 'var(--surface)',
          padding: '0.25rem',
          borderRadius: '0.75rem'
        }}>
          <button
            onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: mode === 'signin' ? 'var(--primary)' : 'transparent',
              color: mode === 'signin' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: mode === 'signup' ? 'var(--primary)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444'
          }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#22c55e'
          }}>
            <CheckCircle size={20} />
            <span style={{ fontSize: '0.9rem' }}>{success}</span>
          </div>
        )}

        {mode !== 'reset' ? (
          <>
            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--surface-hover)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--surface-hover)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 3rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--surface-hover)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '1rem', padding: '0.875rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                <UserIcon size={20} />
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                  style={{
                    width: '100%',
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot password?
                </button>
              )}
            </form>

            {/* Divider */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              marginBottom: '1.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-hover)' }} />
              <span>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-hover)' }} />
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="btn"
              style={{ 
                width: '100%', 
                fontSize: '1rem', 
                padding: '0.875rem',
                backgroundColor: 'white',
                color: '#1f2937',
                border: '1px solid #e5e7eb'
              }}
              disabled={loading}
            >
              <LogIn size={20} />
              Continue with Google
            </button>
          </>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handleEmailAuth}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--surface-hover)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                  disabled={loading}
                />
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                We'll send you a password reset link
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.875rem', marginBottom: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Note: Configure Firebase in src/firebaseConfig.ts
        </p>
      </div>
    </div>
  );
};
