import React, { useState } from 'react';
import { FaExchangeAlt } from 'react-icons/fa';

import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';

// Inventory Transfers list
export default function InventoryTransfersList() {
  // Filters (no backend logic yet)
  const [transferFlow, setTransferFlow] = useState('');
  const [transferStatus, setTransferStatus] = useState('');

  // Pagination placeholders
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Placeholder rows - wire up real data fetching later
  const tableRows = [];

  const transferFlowOptions = [
    { label: 'All', value: '' },
    { label: 'In', value: 'in' },
    { label: 'Out', value: 'out' },
  ];

  const transferStatusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Transit', value: 'inTransit' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={28} />}
        title="Inventory Transfers"
        descriptionLines={[
          'View and manage inventory transfers between stores.',
          'Use the filters to narrow results. No actions are shown in this header.',
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
        emptyMessage="No inventory transfers to display for the selected filters."
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={Math.ceil((tableRows.length || 0) / entriesPerPage)}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={tableRows.length}
      />
    </div>
  );
}