import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from 'lucide-react';

const SettingsView = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Your password has been updated successfully.' });
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'A network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ 
          width: 60, height: 60, background: 'rgba(99, 102, 241, 0.1)', 
          borderRadius: 16, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto 16px',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <Shield size={32} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>
          Account Settings
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your account security and update your password.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px 40px', borderRadius: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Key size={18} color="var(--text-muted)" />
          Change Password
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <style>{`
            .password-input-group {
              position: relative;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .password-input-group label {
              font-size: 0.85rem;
              font-weight: 500;
              color: var(--text-muted);
              margin-left: 2px;
            }
            .eye-toggle {
              position: absolute;
              right: 14px;
              top: 38px;
              background: none;
              border: none;
              color: var(--text-muted);
              cursor: pointer;
              display: flex;
              align-items: center;
              transition: all 0.2s;
              padding: 4px;
              border-radius: 4px;
            }
            .eye-toggle:hover {
              color: white;
              background: rgba(255,255,255,0.05);
            }
            .btn-primary.full-width {
              width: 100%;
              padding: 14px;
              font-size: 1rem;
              font-weight: 600;
              border-radius: 12px;
              margin-top: 12px;
            }
          `}</style>

          <div className="password-input-group">
            <label>Current Password</label>
            <input 
              type={showPasswords.current ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              style={{ paddingRight: 45, height: 48, background: 'rgba(0,0,0,0.2)' }}
            />
            <button type="button" className="eye-toggle" onClick={() => toggleVisibility('current')}>
              {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="password-input-group">
            <label>New Password</label>
            <input 
              type={showPasswords.new ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              style={{ paddingRight: 45, height: 48, background: 'rgba(0,0,0,0.2)' }}
            />
            <button type="button" className="eye-toggle" onClick={() => toggleVisibility('new')}>
              {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="password-input-group">
            <label>Confirm New Password</label>
            <input 
              type={showPasswords.confirm ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              style={{ paddingRight: 45, height: 48, background: 'rgba(0,0,0,0.2)' }}
            />
            <button type="button" className="eye-toggle" onClick={() => toggleVisibility('confirm')}>
              {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {message && (
            <div style={{ 
              padding: '14px 18px', 
              borderRadius: 10, 
              background: message.type === 'success' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
              color: message.type === 'success' ? '#4ade80' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.92rem'
            }}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <button type="submit" className="btn-primary full-width" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {loading ? (
              <div className="loading-spinner" style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                <Save size={20} />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
