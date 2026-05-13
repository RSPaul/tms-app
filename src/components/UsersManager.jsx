import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';

const availableRoles = ['Admin', 'Signer', 'Consultant', 'Payroll'];

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, []);

  const fetchUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  };

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
      });
  };

  const [formData, setFormData] = useState({
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Active',
    roles: [],
    clientId: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const tableData = useDataTable(users);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRoleFilter, setExportRoleFilter] = useState('All');
  const availableFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'roles', label: 'Roles' },
    { key: 'client', label: 'Client Name' }
  ];
  const [exportFields, setExportFields] = useState(availableFields.map(f => f.key));

  const handleExportToggleField = (key) => {
    setExportFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExportCSV = () => {
    // Filter users by role
    let usersToExport = users;
    if (exportRoleFilter !== 'All') {
      usersToExport = users.filter(u => u.roles.includes(exportRoleFilter));
    }

    if (usersToExport.length === 0) {
      alert('No users found with the selected role.');
      return;
    }

    // Generate CSV Header
    const headers = exportFields.map(field => availableFields.find(f => f.key === field).label).join(',');
    
    // Generate CSV Rows
    const rows = usersToExport.map(user => {
      return exportFields.map(field => {
        let val = user[field];
        if (field === 'client') {
          val = user.client ? user.client.name : '';
        }
        if (val == null) val = '';
        // Escape quotes and wrap in quotes if there's a comma
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const currentRoles = prev.roles;
      if (currentRoles.includes(role)) {
        return { ...prev, roles: currentRoles.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...currentRoles, role] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.roles.length === 0) {
      setError('Please select at least one role.');
      return;
    }

    if (formData.roles.includes('Signer') && !formData.clientId) {
      setError('Please select a client for the Signer role.');
      return;
    }

    // Prepare payload
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      roles: formData.roles.join(','), // comma-separated
      clientId: formData.roles.includes('Signer') ? formData.clientId : null
    };

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/users/${formData.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');

      fetchUsers();
      setFormData({ id: null, firstName: '', lastName: '', email: '', phone: '', status: 'Active', roles: [], clientId: '' });
      setIsEditing(false);
      showToast(isEditing ? 'User updated successfully' : 'User created successfully', 'success');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      status: user.status,
      roles: user.roles ? user.roles.split(',') : [],
      clientId: user.clientId || ''
    });
    setIsEditing(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
        fetchUsers();
        showToast('User deleted successfully', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ id: null, firstName: '', lastName: '', email: '', phone: '', status: 'Active', roles: [], clientId: '' });
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="users-manager animate-fade-in">
      <style>{`
        .users-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .roles-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .role-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .role-checkbox input {
          accent-color: var(--primary);
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1e1e2e;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--border);
          width: 90%;
          max-width: 500px;
        }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>{isEditing ? 'Edit User' : 'Add New User'}</h2>
        
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px', background: 'rgba(255, 77, 79, 0.1)', padding: '12px', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input type="text" className="input-field" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input type="text" className="input-field" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={isEditing} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Status</label>
              <select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Roles *</label>
              <div className="roles-group">
                {availableRoles.map(role => (
                  <label key={role} className="role-checkbox">
                    <input 
                      type="checkbox" 
                      checked={formData.roles.includes(role)} 
                      onChange={() => handleRoleToggle(role)} 
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formData.roles.includes('Signer') && (
            <div className="form-group animate-fade-in" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
              <label>Assign Client for Signer *</label>
              <select 
                className="input-field" 
                value={formData.clientId} 
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required={formData.roles.includes('Signer')}
              >
                <option value="">-- Select Client --</option>
                {clients.filter(c => c.status === 'Active').map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: 'auto', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Processing...' : (isEditing ? 'Update User' : 'Save User')}
            </button>
            {isEditing && (
              <button type="button" className="btn-secondary" onClick={handleCancel} style={{ width: 'auto', padding: '10px 24px' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Users List</h2>
          <button className="btn-secondary" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => setShowExportModal(true)}>
            📥 Export to CSV
          </button>
        </div>
        
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
        ) : (
          <div>
            <TableControls {...tableData} />
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('firstName')}>
                      Name {tableData.sortConfig.key === 'firstName' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('email')}>
                      Email {tableData.sortConfig.key === 'email' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ padding: '12px' }}>Roles</th>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('status')}>
                      Status {tableData.sortConfig.key === 'status' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.currentTableData.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.phone}</div>
                      </td>
                      <td style={{ padding: '12px' }}>{user.email}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {user.roles.split(',').map(r => (
                            <span key={r} style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                        {user.client && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Client: {user.client.name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: user.status === 'Active' ? '#4ade80' : '#f87171',
                          background: user.status === 'Active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button className="action-btn" onClick={() => handleEdit(user)} title="Edit">✏️</button>
                        <button className="action-btn delete" onClick={() => handleDelete(user.id)} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination {...tableData} />
          </div>
        )}
      </div>

      {/* Export CSV Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h3 style={{ marginBottom: '16px' }}>Export Users to CSV</h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Filter by Role</label>
              <select className="input-field" value={exportRoleFilter} onChange={(e) => setExportRoleFilter(e.target.value)}>
                <option value="All">All Roles</option>
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Select Fields to Include</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                {availableFields.map(field => (
                  <label key={field.key} className="role-checkbox">
                    <input 
                      type="checkbox" 
                      checked={exportFields.includes(field.key)} 
                      onChange={() => handleExportToggleField(field.key)} 
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowExportModal(false)} style={{ padding: '8px 16px' }}>Cancel</button>
              <button className="btn-primary" onClick={handleExportCSV} style={{ padding: '8px 16px' }}>Export</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

export default UsersManager;
