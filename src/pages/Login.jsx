import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState(null);

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage(null);

    fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    })
    .then(res => res.json())
    .then(data => {
      setForgotMessage({ type: 'success', text: data.message });
    })
    .catch(err => {
      setForgotMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Call actual backend API
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    })
    .then(data => {
      if (onLogin) {
        onLogin(data.user.roles, data.user.firstName);
      }
    })
    .catch(err => {
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const commonStyles = `
    .login-container {
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 40px;
      text-align: center;
    }

    .logo-container {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 8px 16px rgba(99, 102, 241, 0.3));
    }

    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .login-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: white;
    }

    .login-subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 32px;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }

    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--text-muted);
    }

    .error-message {
      color: #ef4444;
      font-size: 0.85rem;
      margin-bottom: 16px;
      text-align: left;
    }
  `;

  if (showForgot) {
    return (
      <div className="login-container">
        <style>{commonStyles}</style>
        <div className="login-card glass-panel animate-fade-in">
          <div className="logo-container">
            <img src="/logo.png" alt="TMS Logo" className="logo-img" />
          </div>
          <h1 className="login-title">Forgot Password</h1>
          <p className="login-subtitle">Enter your email and we'll send you a reset link</p>

          {forgotMessage && (
            <div style={{ 
              padding: '14px 18px', 
              borderRadius: 10, 
              background: forgotMessage.type === 'success' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${forgotMessage.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
              color: forgotMessage.type === 'success' ? '#4ade80' : '#f87171',
              marginBottom: 24, fontSize: '0.9rem', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              {forgotMessage.text}
            </div>
          )}

          <form onSubmit={handleForgotSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '12px', width: '100%', padding: '12px', borderRadius: '10px' }} disabled={loading}>
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <button 
              type="button" 
              onClick={() => setShowForgot(false)}
              style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <style>{commonStyles}</style>
      <div className="login-card glass-panel animate-fade-in">
        <div className="logo-container">
          <img src="/logo.png" alt="TMS Logo" className="logo-img" />
        </div>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to the Timesheet Management System</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button 
                type="button" 
                onClick={() => setShowForgot(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '12px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', padding: '12px', borderRadius: '10px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
