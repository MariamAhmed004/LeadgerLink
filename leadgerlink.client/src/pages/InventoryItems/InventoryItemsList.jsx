import React, { useEffect, useState } from 'react';
import { FaPlus, FaTruck } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';
import { MdOutlineInventory } from "react-icons/md";

// InventoryItemsListPage Component - wired to backend list endpoint
const InventoryItemsListPage = () => {
  // Filter state
  const [stockLevel, setStockLevel] = useState('');
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination / entries state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [items, setItems] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([{ label: 'All Suppliers', value: '' }]);
  const [categoryOptions, setCategoryOptions] = useState([{ label: 'All Categories', value: '' }]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNewInventory = () => {
    // navigate to /inventory/new or open modal (to implement)
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

  // fetch list from server (keep as-is but without sending stockLevel for server-side filtering,
  // since we are going to filter by color client-side consistently)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        // do not append stockLevel; we will filter by colors client-side
        if (supplier) qs.append('supplierId', supplier);
        if (category) qs.append('categoryId', category);
        // fetch a larger page to allow client-side paging
        qs.append('page', '1');
        qs.append('pageSize', '1000');

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
        // totalCount will be recomputed after client-side filter
        setTotalCount((json.items || []).length);

        // optional: refresh supplier/category options from response
        if (json.suppliers) {
          const supOpts = [{ label: 'All Suppliers', value: '' }];
          (json.suppliers || []).forEach(s => supOpts.push({ label: s.name ?? s.supplierName ?? `Supplier ${s.id}`, value: String(s.id ?? s.supplierId) }));
          setSupplierOptions(supOpts);
        }
        if (json.categories) {
          const catOpts = [{ label: 'All Categories', value: '' }];
          (json.categories || []).forEach(c => catOpts.push({ label: c.name ?? `Category ${c.id}`, value: String(c.id ?? c.categoryId) }));
          setCategoryOptions(catOpts);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load inventory items');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
    // supplier/category affect server call; stockLevel does not (client-side)
  }, [supplier, category]);

  // Reset page to 1 when filters change to avoid out-of-range paging
  useEffect(() => {
    setCurrentPage(1);
  }, [stockLevel, supplier, category, entriesPerPage, searchTerm]);

  // Helper
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

  // Map selected stockLevel string to a color for client-side filtering
  const selectedColor =
    stockLevel === 'inStock' ? 'green' :
    stockLevel === 'lowStock' ? 'yellow' :
    stockLevel === 'outOfStock' ? 'red' :
    '';

  // Apply client-side filtering (including search)
  const filtered = (items || []).filter(it => {
    if (selectedColor && getStockColor(it.quantity, it.minimumQuantity) !== selectedColor) return false;
    if (supplier && String(it.supplierId ?? '') !== String(supplier)) return false;
    if (category && String(it.categoryId ?? '') !== String(category)) return false;
    if (searchTerm && searchTerm.trim() !== '') {
      const s = searchTerm.trim().toLowerCase();
      const name = (it.inventoryItemName ?? '').toLowerCase();
      const cat = (it.categoryName ?? '').toLowerCase();
      const sup = (it.supplierName ?? '').toLowerCase();
      const unit = (it.unitName ?? '').toLowerCase();
      if (!(name.includes(s) || cat.includes(s) || sup.includes(s) || unit.includes(s))) return false;
    }
    return true;
  });

  // Client-side paging over filtered
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / entriesPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * entriesPerPage;
  const pagedItems = filtered.slice(start, start + entriesPerPage);

  // Table rows from paged
  const tableRows = pagedItems.map((it) => {
    const color = getStockColor(it.quantity, it.minimumQuantity);
    return [
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

  // Render
  return (
    <div className="container py-5">
      <PageHeader
        icon={<MdOutlineInventory size={55} />}
        title="Inventory Items"
        descriptionLines={[
          'Following are the Inventory Items registered in the organization stores:',
          'Click on the item name to view its details',
        ]}
        actions={[
            { icon: <FaPlus />, title: 'New Inventory Item', route: '/inventory/new', onClick: handleNewInventory },
          { icon: <FaTruck />, title: 'Restock Items', route: '/inventory-items/restock', onClick: handleRestockItems }
        ]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={(v) => setSearchTerm(v)}
        searchPlaceholder="Search items, category, supplier, unit..."
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
        columns={['Stock Level','Item Name','Category','Supplier','Unit','Quantity']}
        rows={tableRows}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No inventory items to display.')}
        linkColumnName="Item Name"
        rowLink={(_, rowIndex) => `/inventory-items/${pagedItems[rowIndex].inventoryItemId}`}
      />

      <PaginationSection
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={totalFiltered}
      />
    </div>
  );
};

export default InventoryItemsListPage;
