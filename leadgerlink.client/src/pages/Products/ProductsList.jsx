import React, { useState } from 'react';
import { FaBoxOpen } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';

// Placeholder Products list
// Static content only — no data fetching or logic.
export default function ProductsList() {
  // Filter state (no logic yet)
  const [source, setSource] = useState('');

  // Pagination placeholders
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Placeholder rows - will be populated when data fetching is implemented
  const tableRows = [];

  const sourceOptions = [
    { label: 'All Sources', value: '' },
    { label: 'Supplier', value: 'supplier' },
    { label: 'Manufacturer', value: 'manufacturer' },
    { label: 'Internal', value: 'internal' },
  ];

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaBoxOpen size={28} />}
        title="Products"
        descriptionLines={[
          'Browse and manage products. Use the source filter to narrow results.',
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
        <div className="col-md-4">
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            options={sourceOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Products"
        columns={['Available', 'Product Name', 'Source', 'Selling Price']}
        rows={tableRows}
        emptyMessage="No products to display for the selected filters."
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