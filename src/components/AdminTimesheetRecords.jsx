import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, Download, ChevronDown, ChevronRight, 
  FileText, User, Briefcase, Clock
} from 'lucide-react';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';
import { generateTimesheetPDF } from '../utils/generateTimesheetPDF';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtHrs = (n) => `${(n ?? 0).toFixed(1)}h`;
const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const AdminTimesheetRecords = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // Lookup data
  const [projects, setProjects] = useState([]);
  const [consultants, setConsultants] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    projectName: '',
    consultantName: '',
    startDate: '',
    endDate: ''
  });

  const tableData = useDataTable(timesheets);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    // Fetch projects on mount
    fetch('/api/admin/projects')
      .then(r => r.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Fetch consultants when project changes
    const selectedProject = projects.find(p => p.name === filters.projectName);
    const projectId = selectedProject?.id;
    
    fetch(`/api/admin/consultants${projectId ? `?projectId=${projectId}` : ''}`)
      .then(r => r.json())
      .then(setConsultants)
      .catch(console.error);
  }, [filters.projectName, projects]);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.projectName) params.append('projectName', filters.projectName);
    if (filters.consultantName) params.append('consultantName', filters.consultantName);
    if (filters.startDate) params.append('entryStartDate', filters.startDate);
    if (filters.endDate) params.append('entryEndDate', filters.endDate);

    fetch(`/api/payroll/timesheets?${params.toString()}`)
      .then(res => res.json())
      .then(data => setTimesheets(data))
      .catch(err => console.error('Error fetching admin records:', err))
      .finally(() => setLoading(false));
  };

  const handleExportPDF = async (tsId) => {
    try {
      const res = await fetch(`/api/payroll/timesheets/${tsId}`);
      const data = await res.json();
      await generateTimesheetPDF(data);
    } catch (e) { alert("Failed to generate PDF"); }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>Timesheet Records</h2>
        <p style={{ color: 'var(--text-muted)' }}>Monitor and audit all timesheets across the system.</p>
      </div>

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Status Filter */}
          <div className="form-group">
            <label>Status</label>
            <select 
              className="filter-select" 
              style={{ width: '100%', minWidth: 'auto', padding: '10px 40px 10px 14px', height: 42 }}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Processed">Processed</option>
            </select>
          </div>

          {/* Project Search */}
          <div className="form-group">
            <label>Project Name</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 2 }} />
              <input 
                list="project-list"
                type="text" 
                className="filter-select" 
                style={{ width: '100%', minWidth: 'auto', padding: '10px 40px 10px 36px', height: 42 }} 
                placeholder="Search project..."
                value={filters.projectName}
                onChange={(e) => handleFilterChange('projectName', e.target.value)}
              />
              <datalist id="project-list">
                {projects.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
          </div>

          {/* Consultant Search */}
          <div className="form-group">
            <label>Consultant Name</label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 2 }} />
              <input 
                list="consultant-list"
                type="text" 
                className="filter-select" 
                style={{ width: '100%', minWidth: 'auto', padding: '10px 40px 10px 36px', height: 42 }} 
                placeholder="Search consultant..."
                value={filters.consultantName}
                onChange={(e) => handleFilterChange('consultantName', e.target.value)}
              />
              <datalist id="consultant-list">
                {consultants.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
          </div>

          {/* Date Range */}
          <div className="form-group">
            <label>Entry Date Range</label>
            <div className="date-range-container" style={{ padding: '6px 12px', gap: 8, height: 42 }}>
              <Calendar size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input 
                type="date" 
                className="date-input" 
                style={{ flex: 1, minWidth: 100, width: '100%' }}
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>-</span>
              <input 
                type="date" 
                className="date-input" 
                style={{ flex: 1, minWidth: 100, width: '100%' }}
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 20 }}>
        <TableControls {...tableData} />
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px', width: 40, borderBottom: '1px solid var(--border)' }}></th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Week Ending</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Consultant</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Project</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Total Hours</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</td></tr>
              ) : tableData.currentTableData.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No timesheets found matching your criteria.</td></tr>
              ) : (
                tableData.currentTableData.map((ts, idx) => (
                  <React.Fragment key={ts.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: expandedId === ts.id ? 'rgba(99,102,241,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px' }}>
                        {expandedId === ts.id ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                      </td>
                      <td style={{ padding: '12px', color: 'white', fontWeight: 500 }}>{fmtDate(ts.weekEndingDate)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                          background: ts.status === 'Processed' ? 'rgba(96,165,250,0.15)' : 
                                      ts.status === 'Approved' ? 'rgba(74,222,128,0.15)' :
                                      ts.status === 'Rejected' ? 'rgba(248,113,113,0.15)' :
                                      ts.status === 'Submitted' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                          color: ts.status === 'Processed' ? '#60a5fa' : 
                                 ts.status === 'Approved' ? '#4ade80' :
                                 ts.status === 'Rejected' ? '#f87171' :
                                 ts.status === 'Submitted' ? '#fbbf24' : 'var(--text-muted)'
                        }}>
                          {ts.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'white' }}>{ts.consultantName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{ts.projectName}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'white' }}>{fmtHrs(ts.hoursWorked + ts.hoursTraveled)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>{fmt$(ts.totalPay)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleExportPDF(ts.id); }}
                          className="action-btn" title="Export PDF"
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === ts.id && (
                      <tr style={{ background: 'rgba(99,102,241,0.03)' }}>
                        <td colSpan={8} style={{ padding: '0 16px 20px 48px' }}>
                          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                              <Clock size={16} color="var(--primary)" />
                              <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Time Entry Details</h4>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Date</th>
                                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Task</th>
                                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)' }}>Hours</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ts.entries?.map(entry => (
                                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '8px 0', color: 'white' }}>{fmtDate(entry.date)}</td>
                                    <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{entry.taskPerformed}</td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'white' }}>{fmtHrs(entry.regularHours + entry.travelHours)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...tableData} />
      </div>
    </div>
  );
};

export default AdminTimesheetRecords;
