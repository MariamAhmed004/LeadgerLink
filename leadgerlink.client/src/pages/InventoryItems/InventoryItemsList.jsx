import React, { useEffect, useState } from 'react';
import { FaPlus, FaTruck } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';

// InventoryItemsListPage Component - wired to backend list endpoint
const InventoryItemsListPage = () => {
  // Filter state
  const [stockLevel, setStockLevel] = useState('');
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('');

  // Pagination / entries state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [items, setItems] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([{ label: 'All', value: '' }]);
  const [categoryOptions, setCategoryOptions] = useState([{ label: 'All', value: '' }]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNewInventory = () => {
    // navigate to /inventory-items/new or open modal (to implement)
  };

  const handleRestockItems = () => {
    // open restock workflow (to implement)
  };

  // Stock level options (values must match server expectations)
  // Server expects stockLevel query param values that can be normalized to:
  // "instock", "lowstock", "outofstock" (case-insensitive).
  const STOCK_LEVEL_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'In Stock', value: 'inStock' },
    { label: 'Low Stock', value: 'lowStock' },
    { label: 'Out of Stock', value: 'outOfStock' },
  ];

  // compute stock indicator color based on quantity vs minimum
  // rules (keeps exact behaviour compatible with server-side filter logic):
  // - red: quantity <= minimum (or quantity <= 0)
  // - yellow: quantity > minimum and quantity <= minimum * 1.5
  // - green: quantity > minimum * 1.5
  // If minimum is missing, treat quantity > 0 as green, otherwise red.
  const getStockColor = (quantity, minimumQuantity) => {
    const qty = Number(quantity ?? 0);
    const min = minimumQuantity == null ? null : Number(minimumQuantity);
    if (min == null) {
      return qty > 0 ? 'green' : 'red';
    }
    if (qty <= min) return 'red';
    if (qty <= min * 1.5) return 'yellow';
    return 'green';
  };

  // fetch list when filters / paging change
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (stockLevel) qs.append('stockLevel', stockLevel); // uses values from STOCK_LEVEL_OPTIONS
        if (supplier) qs.append('supplierId', supplier);
        if (category) qs.append('categoryId', category);
        qs.append('page', String(currentPage));
        qs.append('pageSize', String(entriesPerPage));

        const res = await fetch(`/api/inventoryitems/list-for-current-store?${qs.toString()}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to load inventory items');
        }

        const json = await res.json();
        if (!mounted) return;

        setItems(json.items || []);
        setTotalCount(json.totalCount || 0);

        // build supplier options
        const supOpts = [{ label: 'All Suppliers', value: '' }];
        (json.suppliers || []).forEach(s => supOpts.push({ label: s.name ?? `Supplier ${s.id}`, value: String(s.id) }));
        setSupplierOptions(supOpts);

        // build category options
        const catOpts = [{ label: 'All Categories', value: '' }];
        (json.categories || []).forEach(c => catOpts.push({ label: c.name ?? `Category ${c.id}`, value: String(c.id) }));
        setCategoryOptions(catOpts);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load inventory items');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [stockLevel, supplier, category, currentPage, entriesPerPage]);

  // map items to table rows expected by EntityTable
  // first cell contains only a colored circle (no text)
  const tableRows = items.map((it) => {
    const color = getStockColor(it.quantity, it.minimumQuantity);
    return [
      // Stock Level cell: colored circle only; include accessible label via title/aria-label
      (
        <div className="stock-cell">
          <span
            className={`stock-indicator stock-${color}`}
            aria-label={it.stockLevel ?? color}
            title={it.stockLevel ?? color}
            role="img"
          />
        </div>
      ),
      it.inventoryItemName ?? '',
      it.categoryName ?? '',
      it.supplierName ?? '',
      it.unitName ?? '',
      it.quantity != null ? Number(it.quantity).toFixed(3) : ''
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaTruck size={28} />}
        title="Inventory Items"
        descriptionLines={[
          'Manage inventory items, suppliers and stock levels.',
          'Use filters to narrow the listing. Create or restock items using the actions.',
        ]}
        actions={[
          { icon: <FaPlus />, title: 'New Inventory Item', route: '/inventory-items/new', onClick: handleNewInventory },
          { icon: <FaTruck />, title: 'Restock Items', route: '/inventory-items/restock', onClick: handleRestockItems }
        ]}
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
            label="Stock Level"
            value={stockLevel}
            onChange={setStockLevel}
            options={STOCK_LEVEL_OPTIONS}
          />
        </div>

        <div className="col-md-4">
          <FilterSelect label="Supplier" value={supplier} onChange={setSupplier} options={supplierOptions} />
        </div>

        <div className="col-md-4">
          <FilterSelect label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        </div>
      </FilterSection>

      <EntityTable
        title="Inventory Items"
        columns={[
          'Stock Level',
          'Item Name',
          'Category',
          'Supplier',
          'Unit',
          'Quantity',
        ]}
        rows={tableRows}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No inventory items to display.')}
        linkColumnName="Item Name"
        rowLink={(_, rowIndex) => `/inventory-items/${items[rowIndex].inventoryItemId}`}
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
};

export default InventoryItemsListPage;
