import { useState, useMemo } from 'react';

export const useDataTable = (data, initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Handle Sort Toggle
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let sortableItems = [...data];

    // 1. Global Filter
    if (globalFilter) {
      sortableItems = sortableItems.filter((item) => {
        return Object.values(item).some(val => {
          if (val === null || val === undefined) return false;
          // Search nested objects like client.name
          if (typeof val === 'object') {
            return Object.values(val).some(nestedVal => 
              String(nestedVal).toLowerCase().includes(globalFilter.toLowerCase())
            );
          }
          return String(val).toLowerCase().includes(globalFilter.toLowerCase());
        });
      });
    }

    // 2. Sorting
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nested paths (e.g. 'client.name')
        if (sortConfig.key.includes('.')) {
          const parts = sortConfig.key.split('.');
          aVal = parts.reduce((obj, p) => (obj ? obj[p] : ''), a);
          bVal = parts.reduce((obj, p) => (obj ? obj[p] : ''), b);
        }

        if (aVal === null) aVal = '';
        if (bVal === null) bVal = '';

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [data, globalFilter, sortConfig]);

  // 3. Pagination
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  
  // Ensure current page is within bounds after filtering
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const currentTableData = useMemo(() => {
    const firstPageIndex = (validCurrentPage - 1) * pageSize;
    const lastPageIndex = firstPageIndex + pageSize;
    return processedData.slice(firstPageIndex, lastPageIndex);
  }, [validCurrentPage, pageSize, processedData]);

  return {
    currentTableData,
    requestSort,
    sortConfig,
    globalFilter,
    setGlobalFilter,
    currentPage: validCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalRecords: processedData.length
  };
};
