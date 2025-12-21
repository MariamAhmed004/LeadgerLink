import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';
import { BiSolidPackage } from "react-icons/bi";
import { useAuth } from '../../Context/AuthContext'; // Import the AuthContext to get the logged-in user

/*
  ProductsList.jsx
  Summary:
  - Lists products for the current store or organization with client-side filtering and paging.
  - Supports filtering by source (InventoryItem/Recipe) and text search across name/source/price.
*/

export default function ProductsList() {
  // --------------------------------------------------
  // CONTEXT / ROLE FLAGS
  // --------------------------------------------------
  const { loggedInUser } = useAuth(); // Get the logged-in user
  // roles array for role-based behavior
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin");
  // organization id if available (used when calling org endpoints)
  const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;

  // --------------------------------------------------
  // STATE: filters, paging, data and UI
  // --------------------------------------------------
  // Source filter (InventoryItem / Recipe)
  const [sourceFilter, setSourceFilter] = useState('');
  // Pagination controls
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Search term for client-side search
  const [searchTerm, setSearchTerm] = useState('');
  // Loaded products array
  const [products, setProducts] = useState([]);
  // Loading / error indicators
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --------------------------------------------------
  // CONSTANTS: source options
  // --------------------------------------------------
  const SOURCE_OPTIONS = [
    { label: 'All Sources', value: '' },
    { label: 'Inventory Item', value: 'InventoryItem' },
    { label: 'Recipe', value: 'Recipe' },
  ];

  // --------------------------------------------------
  // EFFECT: load products from server (store or organization)
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Choose endpoint depending on whether current user is organization admin
        const endpoint = isOrgAdmin && orgId
          ? `/api/products/for-organization/${orgId}` // Use the organization endpoint if the user is an org admin
          : '/api/products/for-current-store'; // Default to the current store endpoint

        const res = await fetch(endpoint, { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to load products');
        }
        const json = await res.json();
        if (!mounted) return;
        // store fetched products (JSON shape expected to be an array)
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
  }, [isOrgAdmin, orgId]);

  // --------------------------------------------------
  // DATA PROCESSING: client-side filtering and paging
  // --------------------------------------------------
  // normalized search string for case-insensitive match
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
  const filtered = products.filter((p) => {
    // Source filter (if provided)
    if (sourceFilter && String(sourceFilter).trim() !== '') {
      if (String(p.source) !== String(sourceFilter)) return false;
    }
    // Text search across product name, source and price string
    if (normalizedSearch) {
      const name = String(p.productName ?? '').toLowerCase();
      const source = String(p.source ?? '').toLowerCase();
      const price = p.sellingPrice != null ? `bhd ${Number(p.sellingPrice).toFixed(3)}`.toLowerCase() : '';
      if (!(name.includes(normalizedSearch) || source.includes(normalizedSearch) || price.includes(normalizedSearch))) {
        return false;
      }
    }
    return true;
  });

  // paging calculations
  const total = filtered.length;
  const page = Math.max(1, currentPage);
  const start = (page - 1) * entriesPerPage;
  const paged = filtered.slice(start, start + entriesPerPage);

  // --------------------------------------------------
  // TABLE PREPARATION: columns and rows
  // --------------------------------------------------
  // Base columns; add store column for org admins
  const columns = ['Available', 'Product Name', 'Source', 'Selling Price'];
  if (isOrgAdmin) {
    columns.push('Store Name'); // Add "Store Name" column for organization admins
  }

  // Map products to table rows (JSX cells allowed)
  const tableRows = paged.map((p) => {
    const available = !!p.isAvailable;
    const colorClass = available ? 'stock-green' : 'stock-red';
    const row = [
      (
        <div className="stock-cell">
          <span
            className={`stock-indicator ${colorClass}`}
            title={p.availabilityMessage ?? (available ? 'Available' : 'Unavailable')}
            aria-label={p.availabilityMessage ?? (available ? 'Available' : 'Unavailable')}
            role="img"
          />
        </div>
      ),
      p.productName ?? '',
      p.source ?? '',
      p.sellingPrice != null ? `BHD ${Number(p.sellingPrice).toFixed(3)}` : ''
    ];

    // include store name column for org admins
    if (isOrgAdmin) {
      row.push(p.storeName ?? ''); // Add "Store Name" column value
    }

    return row;
  });

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<BiSolidPackage size={55} />}
        title="Products"
        descriptionLines={[
          'Following are the products added previously:', 'Click on the product name to view its details'
        ]}
        actions={[]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, source or price"
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-4">
          <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} />
        </div>
      </FilterSection>

      <EntityTable
        title="Products"
        columns={columns} // Use dynamic columns
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