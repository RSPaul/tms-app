import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Clock, DollarSign, TrendingUp, TrendingDown,
  CheckCircle, LogOut, Users, Calendar, ArrowUpRight, Wallet, FileText, Filter,
  ChevronDown, ChevronRight, Download
} from 'lucide-react';
import Toast from '../components/Toast';
import TableControls, { TablePagination } from '../components/TableControls';
import { useDataTable } from '../hooks/useDataTable';
import { generateTimesheetPDF } from '../utils/generateTimesheetPDF';
import UserDropdown from '../components/UserDropdown';
import SettingsView from '../components/SettingsView';

const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtHrs = (n) => `${(n ?? 0).toFixed(1)}h`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const StatCard = ({ icon: Icon, label, value, sub, color, accent }) => (
  <div className="glass-panel" style={{ padding: '24px', borderColor: `${accent}33`, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`, pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={accent} />
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

const PeriodCard = ({ title, billed, paid, net, icon: Icon }) => (
  <div className="glass-panel" style={{ padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <Icon size={16} color="#a5b4fc" />
      <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{title}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Billed to Client</span>
        <span style={{ color: '#60a5fa', fontWeight: 600 }}>{fmt$(billed)}</span>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paid to Consultants</span>
        <span style={{ color: '#f87171', fontWeight: 600 }}>{fmt$(paid)}</span>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Net Revenue</span>
        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.05rem' }}>{fmt$(net)}</span>
      </div>
    </div>
  </div>
);

const PayrollDashboard = ({ username, onLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    fetch('/api/payroll/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setToast({ message: 'Failed to load dashboard data', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timesheets', label: 'Process Reports', icon: FileText },
    { id: 'all_records', label: 'Timesheet Records', icon: Calendar },
    { id: 'processed', label: 'Processed Timesheets', icon: CheckCircle },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-dark)', overflow: 'hidden' }}>
      <style>{`
        .pr-sidebar { width: 240px; min-width: 240px; background: rgba(12,12,18,0.98); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 24px 0; }
        .pr-brand { display: flex; align-items: center; gap: 10px; padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
        .pr-brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; color: white; }
        .pr-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 20px; cursor: pointer; transition: all 0.15s; color: var(--text-muted); font-size: 0.9rem; border-left: 3px solid transparent; }
        .pr-nav-item:hover { color: white; background: rgba(255,255,255,0.04); }
        .pr-nav-item.active { color: white; background: rgba(99,102,241,0.12); border-left-color: #6366f1; }
        .pr-logout:hover { color: #f87171; }
        .sidebar-footer { margin-top: auto; padding: 12px 16px; border-top: 1px solid var(--border); }
        .pr-main { flex: 1; overflow-y: auto; padding: 40px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 28px; }
        .period-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 28px; }
        .recent-table { width: 100%; border-collapse: collapse; }
        .recent-table th { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted); font-size: 0.82rem; font-weight: 500; }
        .recent-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem; }
        .recent-table tr:hover td { background: rgba(255,255,255,0.02); }
        .margin-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
      `}</style>

      {/* Sidebar */}
      <aside className="pr-sidebar">
        <div className="pr-brand">
          <div className="pr-brand-icon">TMS</div>
          <div>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>TMS</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payroll Portal</div>
          </div>
        </div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`pr-nav-item${activeMenu === id ? ' active' : ''}`} onClick={() => setActiveMenu(id)}>
              <Icon size={17} />{label}
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

      {/* Main Content */}
      <main className="pr-main">
        {loading ? (
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Loading payroll data...
          </div>
        ) : activeMenu === 'dashboard' ? (
          <div className="animate-fade-in">
            {/* Welcome Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.06))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '28px 32px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', margin: '0 0 6px' }}>
                  Welcome back, {username} 👋
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
                  Here's your payroll overview — {data?.pendingPayrollCount ?? 0} timesheet{data?.pendingPayrollCount !== 1 ? 's' : ''} ready for processing.
                </p>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginBottom: 4 }}>NET MARGIN (ALL TIME)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4ade80' }}>
                  {data?.totalBilled > 0 ? `${(((data.totalBilled - data.totalPaid) / data.totalBilled) * 100).toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid">
              <StatCard icon={CheckCircle} label="Approved Hours (All Time)" value={fmtHrs(data?.totalApprovedHours)} accent="#4ade80" />
              <StatCard icon={Clock} label="Timesheets Pending Payroll" value={data?.pendingPayrollCount ?? 0} sub="Approved, awaiting processing" accent="#f59e0b" />
              <StatCard icon={TrendingUp} label="Total Billed to Clients" value={fmt$(data?.totalBilled)} accent="#60a5fa" />
              <StatCard icon={Wallet} label="Total Paid to Consultants" value={fmt$(data?.totalPaid)} accent="#f87171" />
              <StatCard icon={DollarSign} label="Net Revenue (All Time)" value={fmt$(data?.netRevenue)} sub="Billed minus paid" accent="#a78bfa" />
            </div>

            {/* Period Cards */}
            <h2 style={{ color: 'white', fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Revenue by Period</h2>
            <div className="period-grid">
              <PeriodCard
                title="This Week"
                icon={Calendar}
                billed={data?.thisWeek?.billed}
                paid={data?.thisWeek?.paid}
                net={data?.thisWeek?.net}
              />
              <PeriodCard
                title="This Month"
                icon={TrendingUp}
                billed={data?.thisMonth?.billed}
                paid={data?.thisMonth?.paid}
                net={data?.thisMonth?.net}
              />
            </div>

            {/* Recent Approved Timesheets */}
            {data?.recentTimesheets?.length > 0 && (
              <>
                <h2 style={{ color: 'white', fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>
                  Recently Approved Timesheets
                </h2>
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>Consultant</th>
                        <th>Project / Client</th>
                        <th>Week Ending</th>
                        <th style={{ textAlign: 'right' }}>Hours</th>
                        <th style={{ textAlign: 'right' }}>Billed</th>
                        <th style={{ textAlign: 'right' }}>Paid</th>
                        <th style={{ textAlign: 'right' }}>Net</th>
                        <th style={{ textAlign: 'right' }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTimesheets.map(ts => {
                        const margin = ts.totalBilled > 0 ? ((ts.netRevenue / ts.totalBilled) * 100).toFixed(1) : 0;
                        return (
                          <tr key={ts.id}>
                            <td style={{ color: 'white', fontWeight: 500 }}>{ts.consultantName}</td>
                            <td>
                              <div style={{ color: 'white', fontSize: '0.88rem' }}>{ts.projectName}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{ts.clientName}</div>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{fmtDate(ts.weekEndingDate)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtHrs(ts.totalHours)}</td>
                            <td style={{ textAlign: 'right', color: '#60a5fa' }}>{fmt$(ts.totalBilled)}</td>
                            <td style={{ textAlign: 'right', color: '#f87171' }}>{fmt$(ts.totalPaid)}</td>
                            <td style={{ textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>{fmt$(ts.netRevenue)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="margin-pill" style={{ background: parseFloat(margin) >= 20 ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)', color: parseFloat(margin) >= 20 ? '#4ade80' : '#fbbf24' }}>
                                {margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {(!data?.recentTimesheets?.length) && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <CheckCircle size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p>No approved timesheets yet. They will appear here once signers approve them.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeMenu === 'timesheets' && <PayrollTimesheetsList status="Approved" />}
        {activeMenu === 'all_records' && <ApprovedTimesheetsView mode="records" />}
        {activeMenu === 'processed' && <PayrollTimesheetsList status="Processed" />}
        {activeMenu === 'settings' && <SettingsView />}
      </main>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

const PayrollTimesheetsList = ({ status }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payRateTypeFilter, setPayRateTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const tableData = useDataTable(timesheets);

  useEffect(() => {
    fetchData();
  }, [payRateTypeFilter, status]);

  const fetchData = () => {
    setLoading(true);
    let url = `/api/payroll/timesheets?status=${status}`;
    if (payRateTypeFilter) url += `&payRateType=${payRateTypeFilter}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => setTimesheets(data))
      .catch(err => console.error('Error fetching payroll timesheets:', err))
      .finally(() => setLoading(false));
  };

  const handleBulkProcessClick = () => {
    const ids = timesheets.map(ts => ts.id);
    if (ids.length === 0) return;
    setShowConfirmModal(true);
  };

  const confirmBulkProcess = async () => {
    setShowConfirmModal(false);
    const ids = timesheets.map(ts => ts.id);
    if (ids.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payroll/timesheets/process-bulk', { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to process timesheets");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing timesheets");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: '0 0 4px' }}>
            {status === 'Approved' ? 'Approved Timesheets' : 'Processed Timesheets'}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {status === 'Approved' ? 'Review approved timesheets pending for payroll.' : 'History of processed timesheets.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Filter size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <select
              value={payRateTypeFilter}
              onChange={(e) => setPayRateTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Pay Rate Types</option>
              <option value="W2">W2</option>
              <option value="1099">1099</option>
            </select>
          </div>
          {status === 'Approved' && timesheets.length > 0 && (
            <button 
              onClick={handleBulkProcessClick}
              disabled={isProcessing}
              className="btn-primary"
              style={{ background: '#4ade80', color: '#064e3b', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isProcessing ? 'Processing...' : `Process All (${timesheets.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 20 }}>
        <TableControls {...tableData} />
        
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px', width: 40, borderBottom: '1px solid var(--border)' }}></th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Consultant</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Week Ending Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Client</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Project</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Signer Name</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Hours Worked</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Hours Traveled</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Pay Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Travel Pay Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Total Pay</th>
                {status === 'Processed' && <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Payroll Process Date</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={status === 'Processed' ? 12 : 11} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Loading timesheets...</td></tr>
              ) : tableData.currentTableData.length === 0 ? (
                <tr><td colSpan={status === 'Processed' ? 12 : 11} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No timesheets found.</td></tr>
              ) : (
                tableData.currentTableData.map((ts, idx) => (
                  <React.Fragment key={ts.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: expandedId === ts.id ? 'rgba(99,102,241,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {expandedId === ts.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                      <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem' }}>{ts.consultantName} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>{ts.payRateType}</span></td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{fmtDate(ts.weekEndingDate)}</td>
                    <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem' }}>{ts.clientName}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ts.projectName}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ts.signerName}</td>
                    <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem', textAlign: 'right' }}>{fmtHrs(ts.hoursWorked)}</td>
                    <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem', textAlign: 'right' }}>{fmtHrs(ts.hoursTraveled)}</td>
                    <td style={{ padding: '12px', color: '#60a5fa', fontSize: '0.85rem', textAlign: 'right' }}>{fmt$(ts.payRate)}/h</td>
                      <td style={{ padding: '12px', color: '#60a5fa', fontSize: '0.85rem', textAlign: 'right' }}>{fmt$(ts.travelPayRate)}/h</td>
                      <td style={{ padding: '12px', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>{fmt$(ts.totalPay)}</td>
                      {status === 'Processed' && <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ts.processedAt ? fmtDate(ts.processedAt) : '—'}</td>}
                    </tr>
                    {expandedId === ts.id && (
                      <tr>
                        <td colSpan={status === 'Processed' ? 12 : 11} style={{ padding: 0 }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)', padding: '20px 32px' }}>
                            <TimesheetDetail timesheetId={ts.id} />
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

      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-panel" style={{ width: 400, padding: 24, textAlign: 'center' }}>
            <h3 style={{ color: 'white', marginTop: 0, fontSize: '1.2rem' }}>Confirm Processing</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Are you sure you want to mark <strong>{timesheets.length}</strong> timesheet(s) as Processed? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkProcess}
                style={{ padding: '10px 20px', background: '#4ade80', border: 'none', color: '#064e3b', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Yes, Process All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const TimesheetDetail = ({ timesheetId }) => {
  const [detail, setDetail] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/payroll/timesheets/${timesheetId}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(console.error);
  }, [timesheetId]);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/payroll/timesheets/${timesheetId}`);
      if (!res.ok) throw new Error();
      const fullData = await res.json();
      await generateTimesheetPDF(fullData);
    } catch (e) { console.error('PDF error', e); }
    finally { setPdfLoading(false); }
  };

  if (!detail) return <div style={{ color: 'var(--text-muted)' }}>Loading entries...</div>;

  return (
    <div>
      <h4 style={{ color: 'white', marginBottom: 16, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
    </div>
  );
};

const ApprovedTimesheetsView = ({ mode }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const tableData = useDataTable(timesheets);

  useEffect(() => {
    fetchData();
  }, [dateRange, statusFilter]);

  const fetchData = () => {
    setLoading(true);
    let url = `/api/payroll/timesheets`;
    const params = new URLSearchParams();
    if (dateRange.start) params.append('startDate', dateRange.start);
    if (dateRange.end) params.append('endDate', dateRange.end);
    if (statusFilter) params.append('status', statusFilter);
    else if (mode === 'records') params.append('status', 'all');
    
    const query = params.toString();
    if (query) url += `?${query}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setTimesheets(data))
      .catch(err => console.error('Error fetching timesheet records:', err))
      .finally(() => setLoading(false));
  };

  const handleExportPDF = async (tsId) => {
    try {
      const res = await fetch(`/api/payroll/timesheets/${tsId}`);
      if (!res.ok) throw new Error();
      const fullData = await res.json();
      await generateTimesheetPDF(fullData);
    } catch (e) { 
      console.error('PDF error', e); 
      alert("Failed to generate PDF");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'white', margin: '0 0 4px' }}>
            Timesheet Records
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Comprehensive history of all timesheets across all statuses.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Filter size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Processed">Processed</option>
            </select>
          </div>
          <div className="date-range-container">
            <Calendar size={14} color="var(--text-muted)" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="date-input"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="date-input"
            />
            {(dateRange.start || dateRange.end) && (
              <button 
                onClick={() => setDateRange({ start: '', end: '' })}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', marginLeft: 4 }}
              >
                Clear
              </button>
            )}
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
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Project Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Consultant Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Signer Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Approved Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Processed Date</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Action(s)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</td></tr>
              ) : tableData.currentTableData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : (
                tableData.currentTableData.map((ts, idx) => (
                  <React.Fragment key={ts.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: expandedId === ts.id ? 'rgba(99,102,241,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {expandedId === ts.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                      <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem' }}>{fmtDate(ts.weekEndingDate)}</td>
                      <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: 12, fontWeight: 600,
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
                      <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem' }}>{ts.projectName}</td>
                      <td style={{ padding: '12px', color: 'white', fontSize: '0.85rem' }}>{ts.consultantName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ts.signerName}</td>
                      <td style={{ padding: '12px', color: '#4ade80', fontSize: '0.85rem' }}>{ts.approvedAt ? fmtDate(ts.approvedAt) : '—'}</td>
                      <td style={{ padding: '12px', color: '#60a5fa', fontSize: '0.85rem' }}>{ts.processedAt ? fmtDate(ts.processedAt) : 'Pending'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleExportPDF(ts.id); }}
                          title="Export to PDF"
                          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, color: '#a5b4fc', cursor: 'pointer', padding: '4px 8px' }}
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === ts.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)', padding: '20px 32px' }}>
                            <TimesheetDetail timesheetId={ts.id} />
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

export default PayrollDashboard;
