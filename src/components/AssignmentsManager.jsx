import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';
import TagInput from './TagInput';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isSunday } from 'date-fns';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

const AssignmentsManager = () => {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assignment Form State
  const [formData, setFormData] = useState({
    id: null,
    consultantId: '',
    projectId: '',
    recipientEmails: [],
    status: 'Active',
    initialPayRate: {
      payRate: '',
      billRate: '',
      travelPayRate: '',
      travelBillRate: '',
      payRateType: 'W2',
      effectiveDate: ''
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Expandable Rows State
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Pay Rate Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAssignmentId, setModalAssignmentId] = useState(null);
  const [payRateForm, setPayRateForm] = useState({
    payRate: '',
    billRate: '',
    travelPayRate: '',
    travelBillRate: '',
    payRateType: 'W2',
    effectiveDate: ''
  });

  const tableData = useDataTable(assignments);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, usersRes, projectsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/users'),
        fetch('/api/projects')
      ]);

      const assignmentsData = await assignmentsRes.json();
      const usersData = await usersRes.json();
      const projectsData = await projectsRes.json();

      setAssignments(assignmentsData);
      setUsers(usersData.filter(u => u.status === 'Active' && u.roles && u.roles.includes('Consultant')));
      setProjects(projectsData.filter(p => p.status === 'Active'));
      setLoading(false);
    } catch (err) {
      showToast('Failed to fetch data', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // --- Assignment Handlers ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consultantId || !formData.projectId) {
      showToast('Consultant and Project are required.', 'error');
      return;
    }

    const payload = {
      consultantId: formData.consultantId,
      projectId: formData.projectId,
      recipientEmails: formData.recipientEmails.join(','),
      status: formData.status,
      payRates: isEditing ? [] : [formData.initialPayRate]
    };

    // If creating, ensure initial pay rate has required fields
    if (!isEditing) {
      const pr = formData.initialPayRate;
      if (!pr.payRate || !pr.billRate || !pr.effectiveDate) {
        showToast('Please fill out the initial Pay Rate details.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/assignments/${formData.id}` : '/api/assignments';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save assignment');

      fetchData();
      handleCancel();
      showToast(isEditing ? 'Assignment updated successfully' : 'Assignment created successfully', 'success');
      
      // If new assignment, automatically expand it to encourage adding a pay rate
      if (!isEditing && data.id) {
        toggleRowExpansion(data.id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment) => {
    setFormData({
      id: assignment.id,
      consultantId: assignment.consultantId,
      projectId: assignment.projectId,
      recipientEmails: assignment.recipientEmails ? assignment.recipientEmails.split(',') : [],
      status: assignment.status
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete assignment');
        fetchData();
        showToast('Assignment deleted successfully', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ 
      id: null, consultantId: '', projectId: '', recipientEmails: [], status: 'Active',
      initialPayRate: { payRate: '', billRate: '', travelPayRate: '', travelBillRate: '', payRateType: 'W2', effectiveDate: '' }
    });
    setIsEditing(false);
  };

  // --- Expandable Rows Handlers ---
  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // --- Pay Rate Handlers ---
  const openPayRateModal = (assignmentId) => {
    setModalAssignmentId(assignmentId);
    setPayRateForm({
      payRate: '', billRate: '', travelPayRate: '', travelBillRate: '', payRateType: 'W2', effectiveDate: ''
    });
    setIsModalOpen(true);
  };

  const closePayRateModal = () => {
    setIsModalOpen(false);
    setModalAssignmentId(null);
  };

  const handleSavePayRate = async (e) => {
    e.preventDefault();
    if (!payRateForm.effectiveDate) {
      showToast('Effective Date is required', 'error');
      return;
    }

    try {
      const payload = {
        ...payRateForm,
        assignmentId: modalAssignmentId
      };

      const res = await fetch('/api/payrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save pay rate');

      showToast('Pay Rate added successfully', 'success');
      closePayRateModal();
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const removePayRate = async (payRateId) => {
    if (window.confirm('Are you sure you want to delete this Pay Rate?')) {
      try {
        const res = await fetch(`/api/payrates/${payRateId}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete pay rate');
        }
        showToast('Pay Rate deleted successfully', 'success');
        fetchData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // Helpers for Modal Min Date
  const getMinDateForAssignment = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment || !assignment.payRates || assignment.payRates.length === 0) return null;
    
    // payRates are ordered by ASC from the backend query
    const latestPR = assignment.payRates[assignment.payRates.length - 1];
    const minDate = new Date(latestPR.effectiveDate);
    minDate.setDate(minDate.getDate() + 1); // Must be strictly after
    return minDate;
  };

  return (
    <div className="assignments-manager animate-fade-in">
      <style>{`
        .assignments-manager {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .expand-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .expand-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        .sub-table-container {
          padding: 16px 24px;
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sub-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .sub-table th, .sub-table td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sub-table th {
          color: var(--text-muted);
          font-weight: 500;
          text-align: left;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }
        .modal-content {
          background: var(--bg-light);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 32px;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        /* Custom DatePicker Styling */
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker__input-container input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 10px 12px;
          border-radius: 8px;
          outline: none;
        }
        .react-datepicker__input-container input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .react-datepicker {
          background-color: var(--bg-dark);
          border: 1px solid var(--border);
          font-family: inherit;
          color: white;
        }
        .react-datepicker__header {
          background-color: var(--bg-light);
          border-bottom: 1px solid var(--border);
        }
        .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker__day {
          color: white;
        }
        .react-datepicker__day:hover { background-color: rgba(255,255,255,0.1); }
        .react-datepicker__day--selected { background-color: var(--primary); color: white; }
        .react-datepicker__day--disabled { color: rgba(255,255,255,0.2) !important; }
        
        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
          .modal-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* CREATE / EDIT ASSIGNMENT FORM */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>{isEditing ? 'Edit Assignment' : 'Create New Assignment'}</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Consultant *</label>
              <select className="input-field" value={formData.consultantId} onChange={(e) => setFormData({ ...formData, consultantId: e.target.value })} required>
                <option value="">Select a consultant...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Project *</label>
              <select className="input-field" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} required>
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.client?.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <TagInput 
                tags={formData.recipientEmails} 
                setTags={(tags) => setFormData({ ...formData, recipientEmails: tags })}
                placeholder="Type email and press Enter..."
                tooltip="Optional additional recipient emails to receive Timesheets"
              />
              <div className="form-group">
                <label>Status</label>
                <select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '1rem' }}>Initial Pay Rate</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Effective Date (Sunday) *</label>
                  <DatePicker
                    selected={formData.initialPayRate.effectiveDate ? new Date(formData.initialPayRate.effectiveDate + 'T12:00:00Z') : null}
                    onChange={(date) => {
                      if (!date) return setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, effectiveDate: '' }});
                      const offset = date.getTimezoneOffset();
                      const formattedDate = new Date(date.getTime() - (offset*60*1000)).toISOString().split('T')[0];
                      setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, effectiveDate: formattedDate }});
                    }}
                    filterDate={isSunday}
                    placeholderText="Select a Sunday"
                    className="input-field"
                    dateFormat="yyyy-MM-dd"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pay Rate Type *</label>
                  <select className="input-field" value={formData.initialPayRate.payRateType} onChange={(e) => setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, payRateType: e.target.value }})}>
                    <option value="W2">W2</option>
                    <option value="1099">1099</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Pay Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={formData.initialPayRate.payRate} onChange={(e) => setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, payRate: e.target.value }})} required />
                </div>
                <div className="form-group">
                  <label>Bill Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={formData.initialPayRate.billRate} onChange={(e) => setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, billRate: e.target.value }})} required />
                </div>
                <div className="form-group">
                  <label>Travel Pay Rate $</label>
                  <input type="number" step="0.01" className="input-field" value={formData.initialPayRate.travelPayRate} onChange={(e) => setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, travelPayRate: e.target.value }})} />
                </div>
                <div className="form-group">
                  <label>Travel Bill Rate $</label>
                  <input type="number" step="0.01" className="input-field" value={formData.initialPayRate.travelBillRate} onChange={(e) => setFormData({ ...formData, initialPayRate: { ...formData.initialPayRate, travelBillRate: e.target.value }})} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: 'auto', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Processing...' : (isEditing ? 'Update Assignment' : 'Save Assignment')}
            </button>
            {isEditing && (
              <button type="button" className="btn-secondary" onClick={handleCancel} style={{ width: 'auto', padding: '10px 24px' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ASSIGNMENTS LIST WITH EXPANDABLE ROWS */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Assignments List</h2>
        <TableControls {...tableData} />
        
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No assignments found.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px', width: '40px' }}></th>
                  <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('consultant.firstName')}>
                    Consultant {tableData.sortConfig.key === 'consultant.firstName' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('project.name')}>
                    Project {tableData.sortConfig.key === 'project.name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th className="sortable-header" style={{ padding: '12px' }} onClick={() => tableData.requestSort('status')}>
                    Status {tableData.sortConfig.key === 'status' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableData.currentTableData.map(assignment => {
                  const isExpanded = expandedRows.has(assignment.id);

                  return (
                    <React.Fragment key={assignment.id}>
                      {/* Main Assignment Row */}
                      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255, 255, 255, 0.05)', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '12px' }}>
                          <button className="expand-btn" onClick={() => toggleRowExpansion(assignment.id)}>
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500 }}>
                            {assignment.consultant?.firstName} {assignment.consultant?.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{assignment.consultant?.email}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500 }}>{assignment.project?.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Client: {assignment.project?.client?.name}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            color: assignment.status === 'Active' ? '#4ade80' : '#f87171',
                            background: assignment.status === 'Active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {assignment.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button className="action-btn" onClick={() => handleEdit(assignment)} title="Edit">✏️</button>
                          <button className="action-btn delete" onClick={() => handleDelete(assignment.id)} title="Delete">🗑️</button>
                        </td>
                      </tr>

                      {/* Sub-Table for Pay Rates */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" style={{ padding: 0 }}>
                            <div className="sub-table-container animate-fade-in">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: 'var(--primary)', fontWeight: 500 }}>Pay Rates History</h4>
                                <button className="btn-secondary" onClick={() => openPayRateModal(assignment.id)} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Plus size={14} /> Add Pay Rate
                                </button>
                              </div>

                              {assignment.payRates && assignment.payRates.length > 0 ? (
                                <table className="sub-table">
                                  <thead>
                                    <tr>
                                      <th>Effective Date</th>
                                      <th>Type</th>
                                      <th>Pay / Bill Rate</th>
                                      <th>Travel Rates</th>
                                      <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignment.payRates.map((pr, i) => (
                                      <tr key={pr.id}>
                                        <td>
                                          {new Date(pr.effectiveDate).toLocaleDateString()}
                                          {i === assignment.payRates.length - 1 && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>Current</span>}
                                        </td>
                                        <td>{pr.payRateType}</td>
                                        <td>${pr.payRate} / ${pr.billRate}</td>
                                        <td>${pr.travelPayRate} / ${pr.travelBillRate}</td>
                                        <td style={{ textAlign: 'right' }}>
                                          <button className="action-btn delete" onClick={() => removePayRate(pr.id)} title="Delete Rate">🗑️</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No pay rates defined for this assignment.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination {...tableData} />
      </div>

      {/* PAY RATE MODAL */}
      {isModalOpen && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <h2 style={{ marginBottom: '8px' }}>Add New Pay Rate</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Define the compensation details for this assignment.
            </p>

            <form onSubmit={handleSavePayRate}>
              <div className="modal-grid">
                <div className="form-group">
                  <label>Effective Date (Sunday) *</label>
                  <DatePicker
                    selected={payRateForm.effectiveDate ? new Date(payRateForm.effectiveDate + 'T12:00:00Z') : null}
                    onChange={(date) => {
                      if (!date) return setPayRateForm({ ...payRateForm, effectiveDate: '' });
                      const offset = date.getTimezoneOffset();
                      const formattedDate = new Date(date.getTime() - (offset*60*1000)).toISOString().split('T')[0];
                      setPayRateForm({ ...payRateForm, effectiveDate: formattedDate });
                    }}
                    filterDate={isSunday}
                    minDate={getMinDateForAssignment(modalAssignmentId)}
                    placeholderText="Select a Sunday"
                    className="input-field"
                    dateFormat="yyyy-MM-dd"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pay Rate Type *</label>
                  <select className="input-field" value={payRateForm.payRateType} onChange={(e) => setPayRateForm({ ...payRateForm, payRateType: e.target.value })}>
                    <option value="W2">W2</option>
                    <option value="1099">1099</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Pay Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={payRateForm.payRate} onChange={(e) => setPayRateForm({ ...payRateForm, payRate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Bill Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={payRateForm.billRate} onChange={(e) => setPayRateForm({ ...payRateForm, billRate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Travel Pay Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={payRateForm.travelPayRate} onChange={(e) => setPayRateForm({ ...payRateForm, travelPayRate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Travel Bill Rate $ *</label>
                  <input type="number" step="0.01" className="input-field" value={payRateForm.travelBillRate} onChange={(e) => setPayRateForm({ ...payRateForm, travelBillRate: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={closePayRateModal} style={{ padding: '10px 24px', width: 'auto' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }}>Save Pay Rate</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

export default AssignmentsManager;
