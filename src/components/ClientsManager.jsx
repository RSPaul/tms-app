import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      });
  };

  const [formData, setFormData] = useState({ id: null, name: '', status: 'Active' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const tableData = useDataTable(clients);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/clients/${formData.id}` : '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, status: formData.status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save client');

      fetchClients();
      setFormData({ id: null, name: '', status: 'Active' });
      setIsEditing(false);
      showToast(isEditing ? 'Client updated successfully' : 'Client created successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save client', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setFormData(client);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete client');
        fetchClients();
        showToast('Client deleted successfully', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ id: null, name: '', status: 'Active' });
    setIsEditing(false);
  };

  return (
    <div className="clients-manager animate-fade-in">
      <style>{`
        .clients-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .crud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-panel {
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .table-container {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th, td {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
        }

        th {
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.disabled {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .action-btn.delete:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
        }

        .flex-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }
      `}</style>

      <div className="crud-header">
        <div>
          <h2 style={{ color: 'white', marginBottom: '4px' }}>Client Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Add, update, or remove clients in the system.</p>
        </div>
      </div>

      <div className="glass-panel form-panel">
        <div className="flex-group">
          <label className="form-label" style={{ marginBottom: '0' }}>Client Name</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Enter client name" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        
        <div className="flex-group">
          <label className="form-label" style={{ marginBottom: '0' }}>Status</label>
          <select 
            className="input-field" 
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            style={{ appearance: 'auto' }}
          >
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '12px 24px', opacity: (isSubmitting || !formData.name.trim()) ? 0.7 : 1, cursor: (isSubmitting || !formData.name.trim()) ? 'not-allowed' : 'pointer' }}
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Processing...' : (isEditing ? 'Update Client' : 'Add Client')}
          </button>
          
          {isEditing && (
            <button 
              className="btn-primary" 
              style={{ width: 'auto', padding: '12px 24px', background: 'transparent', border: '1px solid var(--border)' }}
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Clients List</h2>
        <TableControls {...tableData} />
        <div className="table-container" style={{ marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => tableData.requestSort('name')}>
                  Client Name {tableData.sortConfig.key === 'name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th className="sortable-header" onClick={() => tableData.requestSort('status')}>
                  Status {tableData.sortConfig.key === 'status' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.currentTableData.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No clients found.
                  </td>
                </tr>
              ) : (
                tableData.currentTableData.map(client => (
                  <tr key={client.id}>
                    <td style={{ color: 'white', fontWeight: '500' }}>{client.name}</td>
                    <td>
                      <span className={`status-badge ${client.status.toLowerCase()}`}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="action-btn" onClick={() => handleEdit(client)} title="Edit">
                        ✏️
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(client.id)} title="Delete">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...tableData} />
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

export default ClientsManager;
