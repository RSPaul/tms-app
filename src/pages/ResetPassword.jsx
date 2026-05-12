import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle, Eye, EyeOff, Save, ArrowLeft } from 'lucide-react';

const ResetPassword = ({ token, onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset successfully. You can now log in.' });
        setTimeout(() => onComplete(), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset password.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'A network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: 20 }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
        <div style={{ 
          width: 64, height: 64, background: 'rgba(99, 102, 241, 0.1)', 
          borderRadius: 16, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto 24px',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <Key size={32} color="var(--primary)" />
        </div>
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>Set New Password</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>Please enter your new password below.</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>New Password</label>
            <input 
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: 45 }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Confirm New Password</label>
            <input 
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {message && (
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: 8, 
              background: message.type === 'success' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
              color: message.type === 'success' ? '#4ade80' : '#f87171',
              display: 'flex', gap: 10, fontSize: '0.85rem'
            }}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {loading ? (
              <div className="loading-spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                <Save size={18} />
                Reset Password
              </>
            )}
          </button>
        </form>

        <button 
          onClick={onComplete}
          style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
