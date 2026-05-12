import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ConsultantDashboard from './pages/ConsultantDashboard';
import SignerDashboard from './pages/SignerDashboard';
import PayrollDashboard from './pages/PayrollDashboard';
import ResetPassword from './pages/ResetPassword';

function App() {
  const [userRole, setUserRole] = useState(null); // null means not logged in
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialTimesheetId, setInitialTimesheetId] = useState(null);
  const [resetToken, setResetToken] = useState(null);

  useEffect(() => {
    // Check for deep link
    const params = new URLSearchParams(window.location.search);
    const tsId = params.get('timesheetId') || params.get('ts');
    if (tsId) {
      setInitialTimesheetId(tsId);
    }
    
    const token = params.get('token');
    if (token && window.location.pathname === '/reset-password') {
      setResetToken(token);
    }

    // Check if session exists on load
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUserRole(data.user.roles);
        setUsername(data.user.firstName);
      })
      .catch(() => {
        setUserRole(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogin = (role, user) => {
    setUserRole(role);
    setUsername(user);
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      setUserRole(null);
      setUsername('');
      // Optionally remove query param on logout
      window.history.replaceState({}, document.title, "/");
      setInitialTimesheetId(null);
    });
  };

  if (loading) {
    return <div style={{ color: 'white', display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!userRole) {
    if (resetToken) {
      return <ResetPassword token={resetToken} onComplete={() => {
        setResetToken(null);
        window.history.replaceState({}, document.title, "/");
      }} />;
    }
    return <Login onLogin={handleLogin} />;
  }

  if (userRole.includes('Admin')) {
    return <AdminDashboard username={username} onLogout={handleLogout} />;
  } else if (userRole.includes('Signer')) {
    return <SignerDashboard username={username} onLogout={handleLogout} initialTimesheetId={initialTimesheetId} />;
  } else if (userRole.includes('Payroll')) {
    return <PayrollDashboard username={username} onLogout={handleLogout} />;
  } else {
    return <ConsultantDashboard username={username} onLogout={handleLogout} />;
  }
}

export default App;
