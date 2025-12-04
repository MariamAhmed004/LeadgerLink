import React, { useEffect, useState } from 'react';
import { FaBoxOpen } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';


export default function ProductsList() {
  const [sourceFilter, setSourceFilter] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SOURCE_OPTIONS = [
    { label: 'All Sources', value: '' },
    { label: 'Inventory Item', value: 'InventoryItem' },
    { label: 'Recipe', value: 'Recipe' },
  ];

  // fetch products for current store
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/products/for-current-store', { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to load products');
        }
        const json = await res.json();
        if (!mounted) return;
        setProducts(json || []);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load products');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // client-side filtering + paging (server supports store scoping; result set presumably small)
  const filtered = products.filter((p) => {
    if (sourceFilter && String(sourceFilter).trim() !== '') {
      return String(p.source) === String(sourceFilter);
    }
    return true;
  });

  const total = filtered.length;
  const page = Math.max(1, currentPage);
  const start = (page - 1) * entriesPerPage;
  const paged = filtered.slice(start, start + entriesPerPage);

  // map to table rows
  const tableRows = paged.map((p) => {
    const available = !!p.isAvailable;
    const colorClass = available ? 'stock-green' : 'stock-red';
    return [
      // availability indicator (circle)
      (
        <div className="stock-cell">
          <span className={`stock-indicator ${colorClass}`} title={p.availabilityMessage ?? (available ? 'Available' : 'Unavailable')} aria-label={p.availabilityMessage ?? (available ? 'Available' : 'Unavailable')} role="img" />
        </div>
      ),
      p.productName ?? '',
      p.source ?? '',
      p.sellingPrice != null ? `BHD ${Number(p.sellingPrice).toFixed(3)}` : ''
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaBoxOpen size={28} />}
        title="Products"
        descriptionLines={[
          'Browse and manage products. Availability is computed from inventory items or recipe ingredients.',
        ]}
        actions={[]} // no header actions
      />

      <FilterSection
        searchValue={''}
        onSearchChange={() => {}}
        searchPlaceholder=""
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-4">
          <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} />
        </div>
      </FilterSection>

      <EntityTable
        title="Products"
        columns={['Available', 'Product Name', 'Source', 'Selling Price']}
        rows={tableRows}
              emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No products to display.')}
              linkColumnName="Product Name"
         rowLink={(_, rowIndex) => `/products/${paged[rowIndex].productId}`}
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(total / entriesPerPage))}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={total}
      />
    </div>
  );
}