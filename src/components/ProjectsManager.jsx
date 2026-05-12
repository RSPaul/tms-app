import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';

const ProjectsManager = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    clientId: '',
    signerId: '',
    status: 'Active'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const tableData = useDataTable(projects);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes, usersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/users')
      ]);

      const projectsData = await projectsRes.json();
      const clientsData = await clientsRes.json();
      const usersData = await usersRes.json();

      setProjects(projectsData);
      setClients(clientsData.filter(c => c.status === 'Active'));
      // Only keep Active Signers
      setUsers(usersData.filter(u => u.status === 'Active' && u.roles && u.roles.includes('Signer')));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.clientId || !formData.signerId) {
      setError('Project Name, Client, and Signer are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/projects/${formData.id}` : '/api/projects';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save project');

      fetchData();
      handleCancel();
      showToast(isEditing ? 'Project updated successfully' : 'Project created successfully', 'success');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      id: project.id,
      name: project.name,
      description: project.description || '',
      clientId: project.clientId,
      signerId: project.signerId,
      status: project.status
    });
    setIsEditing(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete project');
        fetchData();
        showToast('Project deleted successfully', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ id: null, name: '', description: '', clientId: '', signerId: '', status: 'Active' });
    setIsEditing(false);
    setError('');
  };

  // Filter signers based on selected client
  const availableSigners = users.filter(user => user.clientId === parseInt(formData.clientId));

  return (
    <div className="projects-manager animate-fade-in">
      <style>{`
        .projects-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
        
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px', background: 'rgba(255, 77, 79, 0.1)', padding: '12px', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Project Name *</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select 
                className="input-field" 
                value={formData.status} 
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="input-field" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select 
                className="input-field" 
                value={formData.clientId} 
                onChange={(e) => {
                  setFormData({ ...formData, clientId: e.target.value, signerId: '' }); // Reset signer on client change
                }}
                required
              >
                <option value="">-- Select Client --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Signer (Filtered by Client) *</label>
              <select 
                className="input-field" 
                value={formData.signerId} 
                onChange={(e) => setFormData({ ...formData, signerId: e.target.value })}
                required
                disabled={!formData.clientId}
              >
                <option value="">
                  {!formData.clientId 
                    ? '-- Select Client First --' 
                    : availableSigners.length === 0 
                      ? '-- No Signers found for this Client --' 
                      : '-- Select Signer --'}
                </option>
                {availableSigners.map(signer => (
                  <option key={signer.id} value={signer.id}>
                    {signer.firstName} {signer.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: 'auto', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Processing...' : (isEditing ? 'Update Project' : 'Save Project')}
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
        <h2 style={{ marginBottom: '16px' }}>Projects List</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No projects found.</p>
        ) : (
          <div>
            <TableControls {...tableData} />
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('name')}>
                      Project Name {tableData.sortConfig.key === 'name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('client.name')}>
                      Client {tableData.sortConfig.key === 'client.name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('signer.firstName')}>
                      Signer {tableData.sortConfig.key === 'signer.firstName' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('status')}>
                      Status {tableData.sortConfig.key === 'status' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.currentTableData.map(project => (
                    <tr key={project.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500 }}>{project.name}</div>
                        {project.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{project.description}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--primary)' }}>🏢</span> 
                          {project.client ? project.client.name : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--primary)' }}>✍️</span>
                          {project.signer ? `${project.signer.firstName} ${project.signer.lastName}` : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: project.status === 'Active' ? '#4ade80' : project.status === 'Completed' ? '#60a5fa' : '#fbbf24',
                          background: project.status === 'Active' ? 'rgba(74, 222, 128, 0.1)' : project.status === 'Completed' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {project.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button className="action-btn" onClick={() => handleEdit(project)} title="Edit">✏️</button>
                        <button className="action-btn delete" onClick={() => handleDelete(project.id)} title="Delete">🗑️</button>
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

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

export default ProjectsManager;
