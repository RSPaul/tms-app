import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Clock, FileText, LogOut, Briefcase, CheckCircle, XCircle, AlertCircle, Save, Send } from 'lucide-react';
import Toast from '../components/Toast';
import TimesheetsList from '../components/TimesheetsList';
import UserDropdown from '../components/UserDropdown';
import SettingsView from '../components/SettingsView';

const ConsultantDashboard = ({ username, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [formData, setFormData] = useState({
    assignmentId: '',
    date: new Date().toISOString().split('T')[0],
    taskPerformed: '',
    regularHours: '',
    travelHours: '0'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [dashRes, assignRes, tsRes] = await Promise.all([
        fetch('/api/consultant/dashboard'),
        fetch('/api/consultant/assignments'),
        fetch('/api/consultant/timesheets')
      ]);
      const dashData = await dashRes.json();
      const assignData = await assignRes.json();
      const tsData = await tsRes.json();
      
      setDashboardData(dashData);
      setAssignments(assignData);
      setTimesheets(tsData);
      
      if (assignData.length > 0 && !formData.assignmentId) {
        setFormData(p => ({ ...p, assignmentId: assignData[0].id.toString() }));
      }
    } catch { showToast('Error loading data', 'error'); }
    finally { setLoading(false); }
  };

  // Helper to determine week-ending Sunday for a given date string (YYYY-MM-DD)
  const getWeekEndingDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    d.setDate(d.getDate() + daysToSunday);
    return d.toISOString().split('T')[0];
  };

  // Helper to check if a timesheet is locked for the selected week
  const isWeekLocked = () => {
    if (!formData.assignmentId || !formData.date) return false;
    const weekEndStr = getWeekEndingDate(formData.date);
    const existing = timesheets.find(ts => 
      ts.assignmentId === parseInt(formData.assignmentId) && 
      ts.weekEndingDate.startsWith(weekEndStr)
    );
    return existing && (existing.status === 'Submitted' || existing.status === 'Approved');
  };

  const showToast = (message, type = 'success') => setToast({ message, type });

  const getApplicablePayRate = (assignmentId, selectedDateStr) => {
    const assignment = assignments.find(a => a.id === parseInt(assignmentId));
    if (!assignment?.payRates?.length) return null;
    const selectedDate = new Date(selectedDateStr + 'T12:00:00Z');
    for (const pr of assignment.payRates) {
      if (new Date(pr.effectiveDate) <= selectedDate) return pr;
    }
    return null;
  };

  const handleTimeEntry = async (action) => {
    if (!formData.assignmentId || !formData.date || !formData.taskPerformed || !formData.regularHours) {
      showToast('Please fill out all required fields.', 'error'); return;
    }
    const applicableRate = getApplicablePayRate(formData.assignmentId, formData.date);
    if (!applicableRate) {
      showToast('No active Pay Rate found for this date. Contact Administrator.', 'error'); return;
    }
    if (action === 'submit') {
      if (!window.confirm("Submit this week's timesheet? You won't be able to edit it after.")) return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/consultant/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: formData.assignmentId,
          payRateId: applicableRate.id,
          date: formData.date,
          taskPerformed: formData.taskPerformed,
          regularHours: formData.regularHours,
          travelHours: formData.travelHours || 0,
          action
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(data.message);
      setFormData(p => ({ ...p, taskPerformed: '', regularHours: '', travelHours: '0' }));
      fetchData();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div style={{ color: 'white', display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
      Loading...
    </div>
  );

  const { latestAssignment, latestApprovedTimesheet, latestRejectedTimesheet, pendingDraftTimesheet } = dashboardData || {};
  const isSaturday = new Date().getDay() === 6;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
    { id: 'log-time',  label: 'Log Time',       icon: Clock },
    { id: 'timesheets',label: 'My Timesheets',  icon: FileText },
  ];

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
        .glance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .glance-card { padding: 24px; }
        .glance-icon { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .glance-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
        .glance-title { color: white; font-weight: 600; font-size: 1rem; margin-bottom: 4px; }
        .glance-sub { color: var(--text-muted); font-size: 0.85rem; }
        .sat-alert { padding: 18px 20px; border-radius: 10px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 700px) { .form-row { grid-template-columns: 1fr; } }
      `}</style>

      {/* Sidebar */}
      <aside className="c-sidebar">
        <div className="c-brand">
          <div className="c-brand-icon">TMS</div>
          <div>
            <div className="c-brand-text">TMS</div>
            <div className="c-brand-sub">Consultant Portal</div>
          </div>
        </div>

        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`c-nav-item${activeMenu === id ? ' active' : ''}`}
              onClick={() => setActiveMenu(id)}
            >
              <Icon size={17} />
              {label}
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

      {/* Main content */}
      <main className="c-main">

        {/* ── DASHBOARD VIEW ── */}
        {activeMenu === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="c-page-title">Hey {username} 👋</div>
            <p className="c-page-sub">Here's a quick glance at your current status.</p>

            {isSaturday && pendingDraftTimesheet && (
              <div className="sat-alert">
                <AlertCircle color="#f59e0b" size={28} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 2 }}>Saturday Reminder</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    You have an unsubmitted draft timesheet for week ending{' '}
                    <strong style={{ color: 'white' }}>{new Date(pendingDraftTimesheet.weekEndingDate).toLocaleDateString()}</strong>.
                    {' '}Head to <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveMenu('timesheets')}>My Timesheets</span> to review and submit.
                  </div>
                </div>
              </div>
            )}

            <div className="glance-grid">
              <div className="glass-panel glance-card">
                <div className="glance-icon">
                  <Briefcase color="var(--primary)" size={20} />
                  <span className="glance-label">Latest Assignment</span>
                </div>
                {latestAssignment ? (
                  <>
                    <div className="glance-title">{latestAssignment.project?.name}</div>
                    <div className="glance-sub">Client: {latestAssignment.project?.client?.name}</div>
                    {latestAssignment.payRates?.[0] && (
                      <div style={{ marginTop: 10, display: 'inline-block', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                        ${latestAssignment.payRates[0].payRate}/hr · {latestAssignment.payRates[0].payRateType}
                      </div>
                    )}
                  </>
                ) : <div className="glance-sub">No active assignments.</div>}
              </div>

              <div className="glass-panel glance-card">
                <div className="glance-icon">
                  <CheckCircle color="#4ade80" size={20} />
                  <span className="glance-label">Latest Approved</span>
                </div>
                {latestApprovedTimesheet ? (
                  <>
                    <div className="glance-title">Week Ending {new Date(latestApprovedTimesheet.weekEndingDate).toLocaleDateString()}</div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: '0.85rem' }}>
                      <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} /> Approved
                    </div>
                  </>
                ) : <div className="glance-sub">No approved timesheets yet.</div>}
              </div>

              <div className="glass-panel glance-card">
                <div className="glance-icon">
                  <XCircle color="#f87171" size={20} />
                  <span className="glance-label">Latest Rejected</span>
                </div>
                {latestRejectedTimesheet ? (
                  <>
                    <div className="glance-title">Week Ending {new Date(latestRejectedTimesheet.weekEndingDate).toLocaleDateString()}</div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: '0.85rem' }}>
                      <span style={{ width: 8, height: 8, background: '#f87171', borderRadius: '50%', display: 'inline-block' }} /> Requires Attention
                    </div>
                  </>
                ) : <div className="glance-sub">No rejected timesheets! 🎉</div>}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass-panel" style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveMenu('log-time')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Clock color="var(--primary)" size={20} />
                  <div>
                    <div style={{ color: 'white', fontWeight: 600 }}>Log Time</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Add hours for today</div>
                  </div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveMenu('timesheets')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText color="#60a5fa" size={20} />
                  <div>
                    <div style={{ color: 'white', fontWeight: 600 }}>My Timesheets</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>View history & statuses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LOG TIME VIEW ── */}
        {activeMenu === 'log-time' && (
          <div className="animate-fade-in">
            <div className="c-page-title">Log Time</div>
            <p className="c-page-sub">Enter your hours for a specific day. Save multiple days before submitting the week.</p>

            <div className="glass-panel" style={{ padding: 32 }}>
              <div className="form-row" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>Project / Assignment *</label>
                  <select className="input-field" value={formData.assignmentId} onChange={e => setFormData({ ...formData, assignmentId: e.target.value })}>
                    {assignments.length === 0 && <option value="">No active assignments</option>}
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>{a.project?.name} ({a.project?.client?.name})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Task Performed *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Frontend Development, Client Meeting"
                  value={formData.taskPerformed}
                  onChange={e => setFormData({ ...formData, taskPerformed: e.target.value })}
                />
              </div>

              <div className="form-row" style={{ marginBottom: 32 }}>
                <div className="form-group">
                  <label>Regular Hours *</label>
                  <input type="number" step="0.25" min="0" max="24" className="input-field" value={formData.regularHours} onChange={e => setFormData({ ...formData, regularHours: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Travel Hours</label>
                  <input type="number" step="0.25" min="0" max="24" className="input-field" value={formData.travelHours} onChange={e => setFormData({ ...formData, travelHours: e.target.value })} />
                </div>
              </div>

              {formData.assignmentId && formData.date && (
                <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, fontSize: '0.85rem' }}>
                  {(() => {
                    const rate = getApplicablePayRate(formData.assignmentId, formData.date);
                    return rate
                      ? <span style={{ color: 'var(--text-muted)' }}>Applicable rate: <strong style={{ color: 'white' }}>${rate.payRate}/hr ({rate.payRateType})</strong> · Travel: <strong style={{ color: 'white' }}>${rate.travelPayRate}/hr</strong></span>
                      : <span style={{ color: '#f87171' }}>⚠ No pay rate effective for this date. Contact your administrator.</span>;
                  })()}
                </div>
              )}

              {isWeekLocked() ? (
                <div style={{ marginBottom: 20, padding: '14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle color="#f87171" size={20} />
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
                    <strong>Timesheet Locked:</strong> The timesheet for this week ending has already been submitted or approved. You cannot add new entries.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
                  <button className="btn-secondary" onClick={() => handleTimeEntry('save')} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', width: 'auto', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    <Save size={16} /> Save for Later
                  </button>
                  <button className="btn-primary" onClick={() => handleTimeEntry('submit')} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', width: 'auto', background: isSubmitting ? '#059669' : '#10b981', borderColor: isSubmitting ? '#059669' : '#10b981', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    <Send size={16} className={isSubmitting ? "animate-pulse" : ""} /> {isSubmitting ? 'Processing...' : 'Submit Timesheet'}
                  </button>
                </div>
              )}
              
              {!isWeekLocked() && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 10 }}>
                  "Submit" locks all entries for the entire week ending on the Sunday of the selected date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── MY TIMESHEETS VIEW ── */}
        {activeMenu === 'timesheets' && (
          <div className="animate-fade-in">
            <div className="c-page-title">My Timesheets</div>
            <p className="c-page-sub">View, manage, and track all your submitted timesheets.</p>
            <div className="glass-panel" style={{ padding: 24 }}>
              <TimesheetsList showToast={showToast} />
            </div>
          </div>
        )}
        {activeMenu === 'settings' && <SettingsView />}
      </main>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
};

export default ConsultantDashboard;
