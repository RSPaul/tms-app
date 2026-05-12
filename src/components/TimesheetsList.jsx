import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Send, Trash2, Download } from 'lucide-react';
import TableControls, { TablePagination } from './TableControls';
import { useDataTable } from '../hooks/useDataTable';
import { generateTimesheetPDF } from '../utils/generateTimesheetPDF';

const statusColors = {
  Draft:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  Submitted: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  Approved:  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  Rejected:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

const StatusBadge = ({ status }) => {
  const s = statusColors[status] || statusColors.Draft;
  return (
    <span style={{ color: s.color, background: s.bg, padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
      {status}
    </span>
  );
};

const TimesheetsList = ({ showToast }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const tableData = useDataTable(timesheets);

  useEffect(() => { fetchTimesheets(); }, []);

  const fetchTimesheets = async () => {
    try {
      const res = await fetch('/api/consultant/timesheets');
      if (!res.ok) throw new Error();
      setTimesheets(await res.json());
    } catch { showToast('Failed to load timesheets', 'error'); }
    finally { setLoading(false); }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/consultant/timesheets/${id}`);
      if (!res.ok) throw new Error();
      setDetail(await res.json());
    } catch { showToast('Failed to load timesheet detail', 'error'); }
    finally { setDetailLoading(false); }
  };

  const handleRecall = async (id) => {
    if (!window.confirm('Recall this timesheet back to Draft?')) return;
    try {
      const res = await fetch(`/api/consultant/timesheets/${id}/recall`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Timesheet recalled successfully');
      fetchTimesheets();
      if (expandedId === id) toggleExpand(id);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this timesheet for approval?')) return;
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/consultant/timesheets/${id}/submit`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Timesheet submitted successfully');
      fetchTimesheets();
      if (expandedId === id) { setDetail(d => d ? { ...d, status: 'Submitted' } : d); }
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmittingId(null); }
  };

  const handleDeleteEntry = async (entryId, timesheetId) => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      const res = await fetch(`/api/consultant/time-entries/${entryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Entry deleted');
      fetchTimesheets();
      // Refresh detail
      const dr = await fetch(`/api/consultant/timesheets/${timesheetId}`);
      if (dr.ok) setDetail(await dr.json());
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleExportPDF = async (timesheetId) => {
    setPdfLoadingId(timesheetId);
    try {
      const res = await fetch(`/api/consultant/timesheets/${timesheetId}`);
      if (!res.ok) throw new Error();
      const fullData = await res.json();
      await generateTimesheetPDF(fullData);
    } catch (e) { showToast('Failed to generate PDF', 'error'); }
    finally { setPdfLoadingId(null); }
  };

  if (timesheets.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No timesheets yet. Log some time to get started.</p>;

  return (
    <div>
      <style>{`
        .ts-table { width: 100%; border-collapse: collapse; }
        .ts-table th, .ts-table td { padding: 12px 14px; text-align: left; }
        .ts-table thead tr { border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 0.85rem; }
        .ts-table tbody tr.main-row { border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; }
        .ts-table tbody tr.main-row:hover { background: rgba(255,255,255,0.03); }
        .ts-table tbody tr.main-row.expanded { background: rgba(99,102,241,0.05); border-bottom: none; }
        .detail-row td { padding: 0; }
        .detail-box { padding: 16px 24px; background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .entry-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
        .entry-table th, .entry-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .entry-table th { color: var(--text-muted); font-weight: 500; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: inline-flex; align-items: center; }
        .icon-btn:hover { background: rgba(255,255,255,0.1); }
      `}</style>

      <TableControls {...tableData} />
      <table className="ts-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ width: 36 }}></th>
            <th className="sortable-header" onClick={() => tableData.requestSort('weekEndingDate')} style={{ cursor: 'pointer' }}>
              Week Ending {tableData.sortConfig.key === 'weekEndingDate' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th className="sortable-header" onClick={() => tableData.requestSort('assignment.project.name')} style={{ cursor: 'pointer' }}>
              Project / Client {tableData.sortConfig.key === 'assignment.project.name' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th className="sortable-header" onClick={() => tableData.requestSort('status')} style={{ cursor: 'pointer' }}>
              Status {tableData.sortConfig.key === 'status' ? (tableData.sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th>Reg Hrs</th>
            <th>Travel Hrs</th>
            <th>Entries</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tableData.currentTableData.length === 0 ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No timesheets found.</td></tr>
          ) : tableData.currentTableData.map(ts => {
            const isExp = expandedId === ts.id;
            return (
              <React.Fragment key={ts.id}>
                <tr className={`main-row${isExp ? ' expanded' : ''}`}>
                  <td>
                    <button className="icon-btn" onClick={() => toggleExpand(ts.id)} style={{ color: 'var(--text-muted)' }}>
                      {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td style={{ color: 'white', fontWeight: 500 }}>
                    {new Date(ts.weekEndingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'white' }}>{ts.assignment?.project?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ts.assignment?.project?.client?.name}</div>
                  </td>
                  <td><StatusBadge status={ts.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{ts.totalRegularHours}h</td>
                  <td style={{ color: 'var(--text-muted)' }}>{ts.totalTravelHours}h</td>
                  <td style={{ color: 'var(--text-muted)' }}>{ts.entryCount}</td>
                  <td style={{ textAlign: 'right' }}>
                    {(ts.status === 'Draft' || ts.status === 'Rejected') && (
                      <button
                        className="icon-btn"
                        title="Submit Timesheet"
                        onClick={() => handleSubmit(ts.id)}
                        disabled={submittingId === ts.id}
                        style={{ color: '#4ade80', marginRight: 4, opacity: submittingId === ts.id ? 0.5 : 1, cursor: submittingId === ts.id ? 'wait' : 'pointer' }}
                      >
                        <Send size={15} className={submittingId === ts.id ? "animate-pulse" : ""} />
                      </button>
                    )}
                    {ts.status === 'Submitted' && (
                      <button
                        className="icon-btn"
                        title="Recall Timesheet"
                        onClick={() => handleRecall(ts.id)}
                        style={{ color: '#60a5fa', marginRight: 4 }}
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </td>
                </tr>

                {isExp && (
                  <tr className="detail-row">
                    <td colSpan={8}>
                      <div className="detail-box animate-fade-in">
                        {detailLoading ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading entries...</p>
                        ) : detail && detail.entries.length > 0 ? (
                          <>
                            <table className="entry-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Task Performed</th>
                                  <th>Pay Rate</th>
                                  <th>Reg Hrs</th>
                                  <th>Travel Hrs</th>
                                  {(detail.status === 'Draft' || detail.status === 'Rejected') && <th></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {detail.entries.map(e => (
                                  <tr key={e.id}>
                                    <td style={{ color: 'white' }}>{new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{e.taskPerformed}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>${e.payRate?.payRate}/hr ({e.payRate?.payRateType})</td>
                                    <td style={{ color: 'white' }}>{e.regularHours}h</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{e.travelHours}h</td>
                                    {(detail.status === 'Draft' || detail.status === 'Rejected') && (
                                      <td>
                                        <button className="icon-btn" title="Delete Entry" onClick={() => handleDeleteEntry(e.id, ts.id)} style={{ color: '#f87171' }}>
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Total: <strong style={{ color: 'white' }}>{detail.entries.reduce((s, e) => s + e.regularHours, 0)}h</strong> regular +{' '}
                                <strong style={{ color: 'white' }}>{detail.entries.reduce((s, e) => s + e.travelHours, 0)}h</strong> travel
                              </span>
                              <button
                                className="btn-secondary"
                                onClick={() => handleExportPDF(ts.id)}
                                disabled={pdfLoadingId === ts.id}
                                style={{ padding: '8px 16px', width: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginLeft: 'auto', opacity: pdfLoadingId === ts.id ? 0.7 : 1 }}
                              >
                                <Download size={14} className={pdfLoadingId === ts.id ? 'animate-pulse' : ''} />
                                {pdfLoadingId === ts.id ? 'Generating...' : 'Export PDF'}
                              </button>
                              {(detail.status === 'Draft' || detail.status === 'Rejected') && (
                                <button
                                  className="btn-primary"
                                  onClick={() => handleSubmit(ts.id)}
                                  disabled={submittingId === ts.id}
                                  style={{ marginLeft: 'auto', padding: '8px 20px', width: 'auto', display: 'flex', alignItems: 'center', gap: 8, opacity: submittingId === ts.id ? 0.7 : 1, cursor: submittingId === ts.id ? 'wait' : 'pointer' }}
                                >
                                  <Send size={14} className={submittingId === ts.id ? "animate-pulse" : ""} /> 
                                  {submittingId === ts.id ? 'Submitting...' : 'Submit Timesheet'}
                                </button>
                              )}
                              {detail.status === 'Submitted' && (
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleRecall(ts.id)}
                                  style={{ marginLeft: 'auto', padding: '8px 20px', width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                  <RotateCcw size={14} /> Recall
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No time entries in this timesheet.</p>
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
      <TablePagination {...tableData} />
    </div>
  );
};

export default TimesheetsList;
