import React, { useState } from 'react';
import { LogOut, Users, Briefcase, LayoutDashboard, Settings, Folder, ClipboardList, FileText, TrendingUp, TrendingDown, DollarSign, Activity, UserCheck, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ClientsManager from '../components/ClientsManager';
import UsersManager from '../components/UsersManager';
import ProjectsManager from '../components/ProjectsManager';
import AssignmentsManager from '../components/AssignmentsManager';
import AdminTimesheetRecords from '../components/AdminTimesheetRecords';
import UserDropdown from '../components/UserDropdown';
import SettingsView from '../components/SettingsView';
import ReportsView from '../components/ReportsView';

const AdminDashboard = ({ username, onLogout }) => {
  const [activeModule, setActiveModule] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'timesheet_records', label: 'Timesheet Records', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: var(--bg-dark);
        }

        .sidebar {
          width: 260px;
          background: rgba(20, 20, 25, 0.95);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          z-index: 10;
        }

        .sidebar-header {
          padding: 0 24px 24px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }

        .brand {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          background: linear-gradient(135deg, var(--primary), #ec4899);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .nav-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 16px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }

        .top-header {
          height: 80px;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .welcome-banner {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.05));
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .welcome-title {
          font-size: 2rem;
          color: white;
          font-weight: 700;
        }

        .module-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 24px;
        }

        .module-card {
          padding: 24px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .module-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
          border-color: rgba(255,255,255,0.15);
        }

        .module-icon {
          margin-bottom: 16px;
          color: var(--primary);
        }

        .page-content {
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .logout-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .logout-btn:hover {
          color: white;
          border-color: white;
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <img src="/logo.png" alt="TMS Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            TMS
          </div>
        </div>
        <nav className="nav-menu">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                onClick={() => setActiveModule(item.id)}
              >
                <Icon size={20} />
                {item.label}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div style={{ color: 'var(--text-muted)' }}>
            Admin Portal / <span style={{ color: 'white', textTransform: 'capitalize' }}>{activeModule.replace('_', ' ')}</span>
          </div>
          <UserDropdown 
            username={username} 
            onLogout={onLogout} 
            onSettings={() => setActiveModule('settings')} 
          />
        </header>

        <div className="page-content animate-fade-in">
          {/* Dynamic Content Based on Active Module */}
          <div className="content-area">
            {activeModule === 'dashboard' && <AdminStatsDashboard username={username} />}
            {activeModule === 'clients' && <ClientsManager />}
            {activeModule === 'users' && <UsersManager />}
            {activeModule === 'projects' && <ProjectsManager />}
            {activeModule === 'assignments' && <AssignmentsManager />}
            {activeModule === 'timesheet_records' && <AdminTimesheetRecords />}
            {activeModule === 'reports' && <ReportsView />}
            {activeModule === 'settings' && <SettingsView />}
            
            {/* Placeholders for other modules */}
            {['nothing_here'].includes(activeModule) && (
              <div className="animate-fade-in" style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <h3>{navItems.find(i => i.id === activeModule)?.label} Module</h3>
                <p style={{ marginTop: '12px' }}>This module is currently under construction.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminStatsDashboard = ({ username }) => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/admin/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error('Stats fetch error:', err));
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading system analytics...</div>;
  if (!stats) return <div style={{ color: 'var(--text-muted)' }}>Failed to load dashboard data.</div>;

  const fmt = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="welcome-banner glass-panel">
        <h1 className="welcome-title">Hey {username}, system health looks good.</h1>
        <p style={{ color: 'var(--text-muted)' }}>Overview of your business performance and active operations.</p>
      </div>

      {/* --- System Highlights --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
        <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
            <Folder size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Project Status</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{stats.counts.activeProjectsCount || 0}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Active Projects</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Workforce Utilization</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{stats.counts.activeConsultantsCount || 0}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Consultants</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#10b981', marginTop: 4, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} />
              Managing {stats.counts.activeAssignmentsCount || 0} Assignments
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Margin</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{stats.finance.monthly.marginPercent.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* --- Financial Performance (Overall, Monthly, Weekly) --- */}
      <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, marginTop: 12 }}>Financial Performance</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {['weekly', 'monthly', 'overall'].map(period => {
          const data = stats.finance[period];
          return (
            <div key={period} className="glass-panel" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 16px', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottomLeftRadius: 12 }}>
                {period}
              </div>
              <h3 style={{ color: 'white', marginBottom: 24, fontSize: '1.1rem', textTransform: 'capitalize' }}>{period} Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Revenue</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{fmt(data.revenue)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Direct Cost</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{fmt(data.cost)}</div>
                  </div>
                </div>

                <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${data.marginPercent}%`, 
                    background: 'linear-gradient(90deg, var(--primary), #ec4899)',
                    boxShadow: '0 0 10px rgba(99,102,241,0.5)'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981' }}>
                    <TrendingUp size={16} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{fmt(data.margin)} Profit</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 700 }}>{data.marginPercent.toFixed(1)}% Margin</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Rate Extremes --- */}
      <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, marginTop: 12 }}>Market Rate Analysis</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ color: 'white', marginBottom: 20, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowUpRight size={18} color="#10b981" />
            Top Performing Rates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highest Bill Rate</div>
                <div style={{ color: 'white', fontWeight: 600 }}>{stats.rates.maxBillRate?.assignment.project.client.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stats.rates.maxBillRate?.assignment.project.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{fmt(stats.rates.maxBillRate?.billRate || 0)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ hr</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highest Pay Rate</div>
                <div style={{ color: 'white', fontWeight: 600 }}>{stats.rates.maxPayRate?.assignment.consultant.firstName} {stats.rates.maxPayRate?.assignment.consultant.lastName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Premium Talent</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{fmt(stats.rates.maxPayRate?.payRate || 0)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ hr</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ color: 'white', marginBottom: 20, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowDownRight size={18} color="#f87171" />
            Competitive Entry Rates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lowest Bill Rate</div>
                <div style={{ color: 'white', fontWeight: 600 }}>{stats.rates.minBillRate?.assignment.project.client.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stats.rates.minBillRate?.assignment.project.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>{fmt(stats.rates.minBillRate?.billRate || 0)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ hr</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lowest Pay Rate</div>
                <div style={{ color: 'white', fontWeight: 600 }}>{stats.rates.minPayRate?.assignment.consultant.firstName} {stats.rates.minPayRate?.assignment.consultant.lastName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Entry Level</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>{fmt(stats.rates.minPayRate?.payRate || 0)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ hr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
