import React from 'react';

const TableControls = ({
  globalFilter,
  setGlobalFilter,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  totalRecords
}) => {
  return (
    <div className="table-controls-wrapper animate-fade-in">
      <style>{`
        .table-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
        }
        .controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
        }
        .controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          justify-content: space-between;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .page-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
        }
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sortable-header {
          cursor: pointer;
          user-select: none;
        }
        .sortable-header:hover {
          color: white;
        }
      `}</style>
      
      {/* Top Controls: Page Size and Search */}
      <div className="table-controls">
        <div className="controls-left">
          Show 
          <select 
            className="input-field" 
            style={{ width: '80px', padding: '6px' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          entries
        </div>
        
        <div className="controls-right">
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search all columns..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            style={{ width: '250px' }}
          />
        </div>
      </div>
    </div>
  );
};

export const TablePagination = ({ currentPage, setCurrentPage, totalPages, totalRecords, pageSize }) => {
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="pagination-controls">
      <div>
        Showing {totalRecords === 0 ? 0 : startRecord} to {endRecord} of {totalRecords} entries
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          className="page-btn" 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1 || totalRecords === 0}
        >
          Previous
        </button>
        <span style={{ margin: '0 8px' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button 
          className="page-btn" 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalRecords === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default TableControls;
