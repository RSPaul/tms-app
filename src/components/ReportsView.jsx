import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, TrendingUp, TrendingDown, DollarSign, Download, Filter, Search, Loader2 } from 'lucide-react';

const ReportsView = () => {
  const [activeTab, setActiveTab] = useState('performance');
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [perfFilters, setPerfFilters] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [consultantSearch, setConsultantSearch] = useState('');
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  
  const [consFilters, setConsFilters] = useState({
    consultantId: '',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Report Data
  const [perfData, setPerfData] = useState(null);
  const [consData, setConsData] = useState([]);

  useEffect(() => {
    fetchConsultants();
  }, []);

  const fetchConsultants = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setConsultants(data.filter(u => u.roles.includes('Consultant') && u.status === 'Active'));
    } catch (err) {
      console.error('Failed to fetch consultants', err);
    }
  };

  const fetchPerformanceReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(perfFilters).toString();
      const res = await fetch(`/api/admin/reports/performance?${query}`);
      const data = await res.json();
      setPerfData(data);
    } catch (err) {
      console.error('Performance report error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultantReport = async () => {
    if (!consFilters.consultantId) return;
    setLoading(true);
    try {
      const query = new URLSearchParams(consFilters).toString();
      const res = await fetch(`/api/admin/reports/consultant?${query}`);
      const data = await res.json();
      setConsData(data);
    } catch (err) {
      console.error('Consultant report error', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Totals for Consultant Report
  const consTotals = Array.isArray(consData) ? consData.reduce((acc, row) => ({
    regular: acc.regular + row.regularHours,
    travel: acc.travel + row.travelHours,
    billed: acc.billed + row.amountBilled,
    paid: acc.paid + row.amountPaid
  }), { regular: 0, travel: 0, billed: 0, paid: 0 }) : { regular: 0, travel: 0, billed: 0, paid: 0 };

  return (
    <div className="reports-view animate-fade-in">
      <style>{`
        .reports-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .tabs-container {
          display: inline-flex;
          padding: 6px;
          gap: 4px;
          border-radius: 12px;
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 24px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        .tab-btn.active {
          color: white;
          background: var(--primary);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .report-filters {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .report-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .stat-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-icon {
          padding: 16px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 24px;
        }
        .report-table th {
          text-align: left;
          padding: 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.95rem;
          color: white;
        }
        .report-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        .total-row td {
          background: rgba(99, 102, 241, 0.05);
          font-weight: 700;
          border-top: 2px solid var(--border);
          color: var(--primary);
        }
        .loading-overlay {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--primary);
          font-weight: 600;
        }

        .searchable-dropdown {
          position: relative;
          min-width: 240px;
        }
        .dropdown-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #1a1a2e;
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-top: 4px;
          max-height: 250px;
          overflow-y: auto;
          z-index: 500;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
        }
        .dropdown-item {
          padding: 10px 16px;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .dropdown-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }
        .dropdown-item.selected {
          background: var(--primary);
          color: white;
        }
      `}</style>

      <div className="tabs-container glass-panel">
        <button 
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <BarChart3 size={18} />
          Performance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'consultant' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultant')}
        >
          <Users size={18} />
          Consultants
        </button>
      </div>

      {activeTab === 'performance' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="report-filters">
              <div className="filter-group">
                <label className="filter-label">Start Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ paddingLeft: 36 }}
                    value={perfFilters.start}
                    onChange={(e) => setPerfFilters({ ...perfFilters, start: e.target.value })}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">End Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ paddingLeft: 36 }}
                    value={perfFilters.end}
                    onChange={(e) => setPerfFilters({ ...perfFilters, end: e.target.value })}
                  />
                </div>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }} 
                onClick={fetchPerformanceReport} 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                <span>Generate Report</span>
              </button>
            </div>

            {loading && (
              <div className="loading-overlay">
                <Loader2 className="animate-spin" size={24} />
                <span>Aggregating financial data...</span>
              </div>
            )}

            {perfData && !loading && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="report-card-grid">
                  <div className="glass-panel stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                      <TrendingUp size={28} />
                    </div>
                    <div>
                      <div className="filter-label">Total Amount Billed</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{fmt(perfData.totalBilled)}</div>
                    </div>
                  </div>
                  <div className="glass-panel stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                      <DollarSign size={28} />
                    </div>
                    <div>
                      <div className="filter-label">Total Amount Paid</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{fmt(perfData.totalPaid)}</div>
                    </div>
                  </div>
                  <div className="glass-panel stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      <BarChart3 size={28} />
                    </div>
                    <div>
                      <div className="filter-label">Gross Margin</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{fmt(perfData.grossMargin)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(16,185,129,0.8)' }}>
                        {perfData.totalBilled > 0 ? ((perfData.grossMargin / perfData.totalBilled) * 100).toFixed(1) : 0}% Efficiency
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="glass-panel" style={{ padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Based on {perfData.entryCount} processed timesheet entries in the selected period.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'consultant' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="report-filters">
              <div className="filter-group">
                <label className="filter-label">Consultant</label>
                <div className="searchable-dropdown">
                  <div style={{ position: 'relative' }}>
                    <Search 
                      size={14} 
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                    />
                    <input
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: 36 }}
                      placeholder="Search consultant..."
                      value={consultantSearch}
                      onChange={(e) => {
                        setConsultantSearch(e.target.value);
                        setShowConsultantDropdown(true);
                      }}
                      onFocus={() => setShowConsultantDropdown(true)}
                    />
                  </div>
                  
                  {showConsultantDropdown && (
                    <div className="dropdown-list animate-fade-in">
                      {consultants
                        .filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(consultantSearch.toLowerCase()))
                        .map(c => (
                          <div 
                            key={c.id} 
                            className={`dropdown-item ${consFilters.consultantId === c.id.toString() ? 'selected' : ''}`}
                            onClick={() => {
                              setConsFilters({ ...consFilters, consultantId: c.id.toString() });
                              setConsultantSearch(`${c.firstName} ${c.lastName}`);
                              setShowConsultantDropdown(false);
                            }}
                          >
                            {c.firstName} {c.lastName}
                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{c.email}</div>
                          </div>
                        ))}
                      {consultants.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(consultantSearch.toLowerCase())).length === 0 && (
                        <div className="dropdown-item" style={{ cursor: 'default' }}>No results found</div>
                      )}
                    </div>
                  )}
                  {/* Close dropdown on outside click helper */}
                  {showConsultantDropdown && (
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 450 }} 
                      onClick={() => setShowConsultantDropdown(false)} 
                    />
                  )}
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Start Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ paddingLeft: 36 }}
                    value={consFilters.start}
                    onChange={(e) => setConsFilters({ ...consFilters, start: e.target.value })}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">End Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    className="input-field" 
                    style={{ paddingLeft: 36 }}
                    value={consFilters.end}
                    onChange={(e) => setConsFilters({ ...consFilters, end: e.target.value })}
                  />
                </div>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }} 
                onClick={fetchConsultantReport} 
                disabled={loading || !consFilters.consultantId}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Filter size={18} />}
                <span>Run Report</span>
              </button>
            </div>

            {loading && (
              <div className="loading-overlay">
                <Loader2 className="animate-spin" size={24} />
                <span>Retrieving timesheet history...</span>
              </div>
            )}

            {consData.length > 0 && !loading && (
              <div className="animate-fade-in" style={{ overflowX: 'auto' }}>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Signer</th>
                      <th>Week Ending</th>
                      <th>Reg Hours</th>
                      <th>Trav Hours</th>
                      <th>Amt Billed</th>
                      <th>Amt Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consData.map(row => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.project}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.signer}</td>
                        <td>{new Date(row.weekEnding).toLocaleDateString()}</td>
                        <td>{row.regularHours}</td>
                        <td>{row.travelHours}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(row.amountBilled)}</td>
                        <td style={{ color: 'rgba(255,255,255,0.7)' }}>{fmt(row.amountPaid)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>TOTALS</td>
                      <td>{consTotals.regular}</td>
                      <td>{consTotals.travel}</td>
                      <td>{fmt(consTotals.billed)}</td>
                      <td>{fmt(consTotals.paid)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {!loading && consData.length === 0 && consFilters.consultantId && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No timesheet records found for the selected period.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
