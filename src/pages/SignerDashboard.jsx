import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Clock, CheckCircle, XCircle, LogOut, ChevronDown, ChevronRight, Check, X, AlertCircle, FileText, Download } from 'lucide-react';
import Toast from '../components/Toast';
import TableControls, { TablePagination } from '../components/TableControls';
import { useDataTable } from '../hooks/useDataTable';
import { generateTimesheetPDF } from '../utils/generateTimesheetPDF';
import UserDropdown from '../components/UserDropdown';
import SettingsView from '../components/SettingsView';

const SignerDashboard = ({ username, onLogout, initialTimesheetId }) => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(!!initialTimesheetId);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [expandedId, setExpandedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(null); // stores timesheet id
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tableData = useDataTable(timesheets);

  useEffect(() => {
    const initDeepLink = async () => {
      try {
        const res = await fetch(`/api/signer/timesheets/${initialTimesheetId}`);
        if (!res.ok) {
          showToast('Timesheet not found or access denied.', 'error');
          setActiveMenu('dashboard');
          setIsInitializing(false);
          return;
        }
        const data = await res.json();
        
        if (data.status === 'Submitted') setActiveMenu('pending');
        else if (data.status === 'Approved') setActiveMenu('approved');
        else if (data.status === 'Rejected') setActiveMenu('rejected');
        else setActiveMenu('dashboard');
        
        setExpandedId(data.id);
      } catch (e) {
        showToast('Error loading timesheet.', 'error');
        setActiveMenu('dashboard');
      } finally {
        setIsInitializing(false);
      }
    };
    
    if (initialTimesheetId) {
      initDeepLink();
    }
  }, [initialTimesheetId]);

  useEffect(() => {
    if (!isInitializing) {
      fetchData();
    }
  }, [activeMenu, isInitializing]);

  const fetchData = async () => {
    try {
      if (activeMenu === 'dashboard') {
        const res = await fetch('/api/signer/dashboard');
        const data = await res.json();
        setDashboardData(data);
      } else {
        let statusFilter = '';
        if (activeMenu === 'pending') statusFilter = 'Submitted';
        else if (activeMenu === 'approved') statusFilter = 'Approved';
        else if (activeMenu === 'rejected') statusFilter = 'Rejected';

        const res = await fetch(`/api/signer/timesheets?status=${statusFilter}`);
        const data = await res.json();
        setTimesheets(data);
      }
    } catch (error) {
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleAction = async (id, action) => {
    setIsSubmitting(true);
    try {
      const body = action === 'reject' ? { reason: rejectReason } : {};
      const res = await fetch(`/api/signer/timesheets/${id}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(data.message);
      setIsRejecting(null);
      setRejectReason('');
      setExpandedId(null);
      fetchData(); // refresh list
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pending', label: 'Pending Reviews', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
  ];

  if (loading) return <div style={{ color: 'white', display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-dark)', overflow: 'hidden' }}>
      <style>{`
        .c-sidebar { width: 240px; min-width: 240px; background: rgba(15,15,20,0.98); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 24px 0; }
        .c-brand { display: flex; align-items: center; gap: 10px; padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
        .c-brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, var(--primary), #ec4899); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; color: white; }
        .c-brand-text { font-weight: 700; color: white; font-size: 1rem; }
        .c-brand-sub { font-size: 0.72rem; color: var(--text-muted); }
        .c-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 20px; cursor: pointer; border-radius: 0; transition: all 0.15s; color: var(--text-muted); font-size: 0.9rem; border-left: 3px solid transparent; }
        .c-nav-item:hover { color: white; background: rgba(255,255,255,0.04); }
        .c-nav-item.active { color: white; background: rgba(99,102,241,0.12); border-left-color: var(--primary); }
        .c-logout:hover { color: #f87171; }
        .sidebar-footer { margin-top: auto; padding: 12px 16px; border-top: 1px solid var(--border); }
        .c-main { flex: 1; overflow-y: auto; padding: 40px; }
        .c-page-title { font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 4px; }
        .c-page-sub { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 32px; }
        .glance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .glance-card { padding: 24px; }
        .glance-icon { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .glance-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
        .glance-val { font-size: 2rem; font-weight: 700; color: white; }
        
        /* Table Styles */
        .ts-table { width: 100%; border-collapse: collapse; text-align: left; }
        .ts-th { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-weight: 500; font-size: 0.85rem; }
        .ts-td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: white; font-size: 0.95rem; }
        .ts-row { transition: background 0.15s; cursor: pointer; }
        .ts-row:hover { background: rgba(255,255,255,0.02); }
        .ts-row.expanded { background: rgba(99,102,241,0.04); }
        .ts-detail { background: rgba(0,0,0,0.2); padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
      `}</style>

      <aside className="c-sidebar">
        <div className="c-brand">
          <img src="/logo.png" alt="TMS Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <div className="c-brand-text">TMS</div>
            <div className="c-brand-sub">Signer Portal</div>
          </div>
        </div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`c-nav-item${activeMenu === id ? ' active' : ''}`} onClick={() => { setActiveMenu(id); setExpandedId(null); }}>
              <Icon size={17} />
              {label}
              {id === 'pending' && dashboardData?.pendingCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                  {dashboardData.pendingCount}
                </span>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <UserDropdown 
            username={username} 
            onLogout={onLogout} 
            onSettings={() => setActiveMenu('settings')} 
          />
        </div>
      </aside>

      <main className="c-main">
        {activeMenu === 'dashboard' && dashboardData && (
          <div className="animate-fade-in">
            <div className="c-page-title">Signer Dashboard</div>
            <p className="c-page-sub">Welcome back, {username}. Here is an overview of timesheets awaiting your review.</p>

            <div className="glance-grid">
              <div className="glass-panel glance-card" style={{ borderColor: dashboardData.pendingCount > 0 ? 'rgba(245,158,11,0.5)' : '' }}>
                <div className="glance-icon">
                  <Clock color="#f59e0b" size={20} />
                  <span className="glance-label">Pending Reviews</span>
                </div>
                <div className="glance-val">{dashboardData.pendingCount}</div>
              </div>
              <div className="glass-panel glance-card">
                <div className="glance-icon">
                  <CheckCircle color="#4ade80" size={20} />
                  <span className="glance-label">Total Approved Hours</span>
                </div>
                <div className="glance-val">{dashboardData.approvedHours}</div>
              </div>
              <div className="glass-panel glance-card">
                <div className="glance-icon">
                  <FileText color="#60a5fa" size={20} />
                  <span className="glance-label">Draft Hours In Progress</span>
                </div>
                <div className="glance-val">{dashboardData.draftHours}</div>
              </div>
              <div className="glass-panel glance-card" style={{ borderColor: dashboardData.rejectedCount > 0 ? 'rgba(248,113,113,0.5)' : '' }}>
                <div className="glance-icon">
                  <XCircle color="#f87171" size={20} />
                  <span className="glance-label">Awaiting Resubmission (Rejected)</span>
                </div>
                <div className="glance-val">{dashboardData.rejectedCount}</div>
              </div>
            </div>
          </div>
        )}

        {['pending', 'approved', 'rejected'].includes(activeMenu) && (
          <div className="animate-fade-in">
            <div className="c-page-title">{navItems.find(n => n.id === activeMenu)?.label}</div>
            <p className="c-page-sub">Review timesheets and entry details.</p>

            <div className="glass-panel">
              <TableControls {...tableData} />
              <table className="ts-table" style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th className="ts-th" style={{ width: 40 }}></th>
                    <th className="ts-th sortable-header" onClick={() => tableData.requestSort('assignment.consultant.firstName')} style={{ cursor: 'pointer' }}>
                      Consultant {tableData.sortConfig.key === 'assignment.consultant.firstName' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="ts-th sortable-header" onClick={() => tableData.requestSort('assignment.project.name')} style={{ cursor: 'pointer' }}>
                      Project {tableData.sortConfig.key === 'assignment.project.name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="ts-th sortable-header" onClick={() => tableData.requestSort('weekEndingDate')} style={{ cursor: 'pointer' }}>
                      Week Ending {tableData.sortConfig.key === 'weekEndingDate' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th className="ts-th text-right">Reg Hrs</th>
                    <th className="ts-th text-right">Trvl Hrs</th>
                    <th className="ts-th text-center">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.currentTableData.length === 0 ? (
                    <tr><td colSpan="7" className="ts-td text-center" style={{ color: 'var(--text-muted)' }}>No timesheets found.</td></tr>
                  ) : tableData.currentTableData.map(ts => (
                    <React.Fragment key={ts.id}>
                      <tr className={`ts-row ${expandedId === ts.id ? 'expanded' : ''}`} onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}>
                        <td className="ts-td" style={{ color: 'var(--text-muted)' }}>
                          {expandedId === ts.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </td>
                        <td className="ts-td">{ts.assignment.consultant.firstName} {ts.assignment.consultant.lastName}</td>
                        <td className="ts-td">{ts.assignment.project.name}</td>
                        <td className="ts-td">{new Date(ts.weekEndingDate).toLocaleDateString()}</td>
                        <td className="ts-td text-right font-semibold">{ts.totalRegularHours}</td>
                        <td className="ts-td text-right font-semibold">{ts.totalTravelHours}</td>
                        <td className="ts-td text-center">{ts.entryCount}</td>
                      </tr>
                      {expandedId === ts.id && (
                        <tr>
                          <td colSpan="7" style={{ padding: 0 }}>
                            <div className="ts-detail animate-fade-in">
                              <TimesheetDetail 
                                timesheetId={ts.id} 
                                showActions={activeMenu === 'pending'}
                                onApprove={() => handleAction(ts.id, 'approve')}
                                onReject={() => setIsRejecting(ts.id)}
                                isRejecting={isRejecting === ts.id}
                                isSubmitting={isSubmitting}
                                rejectReason={rejectReason}
                                setRejectReason={setRejectReason}
                                confirmReject={() => handleAction(ts.id, 'reject')}
                                cancelReject={() => { setIsRejecting(null); setRejectReason(''); }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <TablePagination {...tableData} />
            </div>
          </div>
        )}

        {/* ── SETTINGS VIEW ── */}
        {activeMenu === 'settings' && <SettingsView />}
      </main>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

// Sub-component for fetching and showing specific timesheet entries
const TimesheetDetail = ({ timesheetId, showActions, onApprove, onReject, isRejecting, isSubmitting, rejectReason, setRejectReason, confirmReject, cancelReject }) => {
  const [detail, setDetail] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/signer/timesheets/${timesheetId}`);
      if (!res.ok) throw new Error();
      const fullData = await res.json();
      await generateTimesheetPDF(fullData);
    } catch (e) { console.error('PDF error', e); }
    finally { setPdfLoading(false); }
  };
  
  useEffect(() => {
    fetch(`/api/signer/timesheets/${timesheetId}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(console.error);
  }, [timesheetId]);

  if (!detail) return <div style={{ color: 'var(--text-muted)' }}>Loading entries...</div>;
  if (detail.error) return <div style={{ color: '#ef4444', padding: '16px' }}>{detail.error}</div>;

  return (
    <div>
      <h4 style={{ color: 'white', marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Daily Entries
        <button
          onClick={handleExportPDF}
          disabled={pdfLoading || !detail}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, color: '#a5b4fc', cursor: pdfLoading ? 'wait' : 'pointer', fontSize: '0.8rem', opacity: pdfLoading ? 0.7 : 1 }}
        >
          <Download size={13} className={pdfLoading ? 'animate-pulse' : ''} />
          {pdfLoading ? 'Generating...' : 'Export PDF'}
        </button>
      </h4>
      <div style={{ background: 'var(--bg-dark)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Date</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Task</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Reg Hrs</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Trvl Hrs</th>
            </tr>
          </thead>
          <tbody>
            {detail.entries.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '10px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>No entries found.</td></tr>
            )}
            {detail.entries.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '10px 16px', color: 'white' }}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{e.taskPerformed}</td>
                <td style={{ padding: '10px 16px', color: 'white', textAlign: 'right' }}>{e.regularHours}</td>
                <td style={{ padding: '10px 16px', color: 'white', textAlign: 'right' }}>{e.travelHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showActions && (
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {isRejecting ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', background: 'rgba(248,113,113,0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Reason for rejection (optional)..." 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                style={{ flex: 1 }}
                disabled={isSubmitting}
              />
              <button className="btn-primary" disabled={isSubmitting} style={{ background: '#f87171', borderColor: '#f87171', width: 'auto', padding: '8px 16px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} onClick={confirmReject}>
                {isSubmitting ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button className="btn-secondary" disabled={isSubmitting} style={{ width: 'auto', padding: '8px 16px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} onClick={cancelReject}>Cancel</button>
            </div>
          ) : (
            <>
              <button className="btn-secondary" disabled={isSubmitting} style={{ width: 'auto', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, borderColor: 'rgba(248,113,113,0.5)', color: '#fca5a5', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} onClick={onReject}>
                <X size={16} /> Reject
              </button>
              <button className="btn-primary" disabled={isSubmitting} style={{ width: 'auto', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, background: isSubmitting ? '#059669' : '#10b981', borderColor: isSubmitting ? '#059669' : '#10b981', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} onClick={onApprove}>
                <Check size={16} className={isSubmitting ? "animate-pulse" : ""} /> {isSubmitting ? 'Processing...' : 'Approve'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SignerDashboard;
