import React, { useEffect, useState } from 'react';
import { FaExchangeAlt, FaArrowDown, FaArrowUp } from 'react-icons/fa';

import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';

// Inventory Transfers list
export default function InventoryTransfersList() {
  // Filters
  const [transferFlow, setTransferFlow] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [transferStatusOptions, setTransferStatusOptions] = useState([{ label: 'All', value: '' }]);

  // Pagination state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [rowsData, setRowsData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const transferFlowOptions = [
    { label: 'All', value: '' },
    { label: 'In', value: 'in' },
    { label: 'Out', value: 'out' },
  ];

  useEffect(() => {
    let mounted = true;
    const loadStatuses = async () => {
      try {
        const res = await fetch('/api/inventorytransfers/statuses', { credentials: 'include' });
        if (!res.ok) return;
        const arr = await res.json();
        if (!mounted) return;
        const opts = [{ label: 'All', value: '' }, ...(Array.isArray(arr) ? arr.map(s => ({ label: s, value: s })) : [])];
        setTransferStatusOptions(opts);
      } catch (err) {
        console.error('Failed to load transfer statuses', err);
      }
    };

    loadStatuses();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (transferFlow) qs.append('flow', transferFlow);
        if (transferStatus) qs.append('status', transferStatus);
        qs.append('page', String(currentPage));
        qs.append('pageSize', String(entriesPerPage));

        const res = await fetch(`/api/inventorytransfers/list-for-current-store?${qs.toString()}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to load transfers');
        }

        const json = await res.json();
        if (!mounted) return;

        setRowsData(json.items || []);
        setTotalCount(json.totalCount || 0);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load transfers');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [transferFlow, transferStatus, currentPage, entriesPerPage]);

  const tableRows = rowsData.map((t) => {
    const inOutCell = (t.inOut || '').toString().toLowerCase() === 'in'
      ? <span className="text-success" title="In"><FaArrowDown size={18} /></span>
      : (t.inOut || '').toString().toLowerCase() === 'out'
        ? <span className="text-danger" title="Out"><FaArrowUp size={18} /></span>
        : (t.inOut ?? 'N/A');

    return [
      inOutCell,
      t.requestedAt ? new Date(t.requestedAt).toLocaleString() : '',
      t.storeInvolved ?? '',
      t.status ?? '',
      t.driverName ?? 'Not assigned'
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={28} />}
        title="Inventory Transfers"
        descriptionLines={[
          'View and manage inventory transfers between stores.',
          'Use the filters to narrow results.',
        ]}
        actions={[]} // explicitly no action buttons in header
      />

      <FilterSection
        searchValue={''}
        onSearchChange={() => {}}
        searchPlaceholder=""
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-3">
          <FilterSelect
            label="Transfer Flow"
            value={transferFlow}
            onChange={setTransferFlow}
            options={transferFlowOptions}
          />
        </div>

        <div className="col-md-3">
          <FilterSelect
            label="Transfer Status"
            value={transferStatus}
            onChange={setTransferStatus}
            options={transferStatusOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Transfers"
        columns={[
          'In/Out',
          'Requested On',
          'Store Involved',
          'Status',
          'Driver',
        ]}
        rows={tableRows}
        // Use "Requested On" column as the link column - rowLink builds route from the original data item
        linkColumnName="Requested On"
        rowLink={(_, rowIndex) => {
          const t = rowsData[rowIndex] || {};
          const id = t.transferId ?? t.id ?? t.inventoryTransferId ?? "";
            return id ? `/inventory/transfers/${id}` : "";
        }}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No inventory transfers to display for the selected filters.')}
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil((totalCount || 0) / entriesPerPage))}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={totalCount}
      />
    </div>
  );
}