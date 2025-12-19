import React, { useEffect, useState } from 'react';
import { FaPlus, FaTruck, FaUpload } from 'react-icons/fa'; // Import FaUpload for the bulk upload icon
import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';
import InfoModal from '../../components/Ui/InfoModal'; // Import InfoModal
import { MdOutlineInventory } from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";

// InventoryItemsListPage Component - wired to backend list endpoint
const InventoryItemsListPage = () => {
  // Modal state
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

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
  const { loggedInUser } = useAuth();
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin");

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
        if (supplier) qs.append('supplierId', supplier);
        if (category) qs.append('categoryId', category);
        qs.append('page', '1');
        qs.append('pageSize', '1000');

        let url;
        if (isOrgAdmin) {
          const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;
          url = "/api/inventoryitems/list-for-organization";
          if (orgId) qs.append("organizationId", String(orgId));
        } else {
          url = "/api/inventoryitems/list-for-current-store";
        }

        const res = await fetch(`${url}?${qs.toString()}`, {
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
  }, [supplier, category, isOrgAdmin, loggedInUser]);

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
    const baseRow = [
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
    if (isOrgAdmin) {
      baseRow.splice(1, 0, it.storeName ?? ''); // Insert storeName after stock indicator
    }
    return baseRow;
  });

  // Table columns
  const columns = isOrgAdmin
    ? ['Stock Level', 'Store', 'Item Name', 'Category', 'Supplier', 'Unit', 'Quantity']
    : ['Stock Level', 'Item Name', 'Category', 'Supplier', 'Unit', 'Quantity'];

  // Function to download the template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/inventoryitems/template', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'InventoryTemplate.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

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
            { icon: <FaPlus />, title: 'New Inventory Item', route: '/inventory/new' },
          { icon: <FaTruck />, title: 'Restock Items', route: '/inventory-items/restock' },
          {
            icon: <FaUpload />,
            title: 'Bulk Upload Inventory Items',
            onClick: () => {
              console.log("Bulk Upload button clicked");
              setShowBulkUploadModal(true);
            },
          },
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
        columns={columns}
        rows={tableRows}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No inventory items to display.')}
        linkColumnName={isOrgAdmin ? 'Item Name' : 'Item Name'}
        rowLink={(_, rowIndex) => isOrgAdmin
          ? `/inventory-items/${pagedItems[rowIndex].inventoryItemId}`
          : `/inventory-items/${pagedItems[rowIndex].inventoryItemId}`}
      />

      <PaginationSection
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={totalFiltered}
          />


          {/* InfoModal for Bulk Upload */}
          <InfoModal
              show={showBulkUploadModal}
              title="Bulk Upload Inventory Items"
              onClose={() => setShowBulkUploadModal(false)}
          >
              <p>
                  Use this feature to bulk upload inventory items. You can download the template below, fill it out, and upload it back to the system.
              </p>
              <div className="text-end">
                  <button className="btn btn-primary" onClick={handleDownloadTemplate}>
                      Download Template
                  </button>
              </div>
          </InfoModal>

    </div>
  );
};

export default InventoryItemsListPage;
