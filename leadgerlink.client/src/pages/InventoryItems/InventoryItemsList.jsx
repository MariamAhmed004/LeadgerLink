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
import SelectField from "../../components/Form/SelectField";
import { useLocation } from 'react-router-dom';


// --------------------------------------------------
// InventoryItemsListPage
// Summary:
// - Lists inventory items for the current store or organization.
// - Supports client-side filtering (stock level, supplier, category, search),
//   pagination and bulk upload via an InfoModal.
// --------------------------------------------------
// InventoryItemsListPage Component - wired to backend list endpoint
const InventoryItemsListPage = () => {
  // --------------------------------------------------
  // MODAL STATE
  // --------------------------------------------------
  // Controls visibility of the bulk upload modal
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const location = useLocation();

  // --------------------------------------------------
  // FILTER STATE
  // --------------------------------------------------
  // Selected stock level filter (client-side color mapping)
  const [stockLevel, setStockLevel] = useState('');
  // Supplier and category filters
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('');
  // Free-text search term
  const [searchTerm, setSearchTerm] = useState('');

  // --------------------------------------------------
  // PAGINATION / ENTRIES
  // --------------------------------------------------
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --------------------------------------------------
  // DATA STATE
  // --------------------------------------------------
  // Loaded items and lookup options
  const [items, setItems] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([{ label: 'All Suppliers', value: '' }]);
  const [categoryOptions, setCategoryOptions] = useState([{ label: 'All Categories', value: '' }]);
  const [totalCount, setTotalCount] = useState(0);
  // Loading and error UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Auth context and role-based flag
  const { loggedInUser } = useAuth();
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin");

  // --------------------------------------------------
  // FILE UPLOAD / STORE SELECTION STATE
  // --------------------------------------------------
  // File selected for upload and store selection for org admins
  const [file, setFile] = useState(null);
  const [storeId, setStoreId] = useState(isOrgAdmin ? "" : loggedInUser?.storeId ?? "");
  const [stores, setStores] = useState([]);

  // InfoModal payload for upload results / errors
  const [infoModal, setInfoModal] = useState({
    show: false,
    title: '',
    message: '',
    onClose: null,
  });

  // --------------------------------------------------
  // CONSTANTS: stock level options and mapping notes
  // --------------------------------------------------
  // Server expects stockLevel query param values that can be normalized to:
  // "instock", "lowstock", "outofstock" (case-insensitive).
  const STOCK_LEVEL_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'In Stock', value: 'inStock' },
    { label: 'Low Stock', value: 'lowStock' },
    { label: 'Out of Stock', value: 'outOfStock' },
  ];

  // --------------------------------------------------
  // EFFECT: load inventory items and lookups from server
  // --------------------------------------------------
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

        // set items and a provisional total count
        setItems(json.items || []);
        setTotalCount((json.items || []).length);

        // optional: update supplier/category select options if provided by server
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

  // --------------------------------------------------
  // EFFECT: reset paging when filters change
  // --------------------------------------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [stockLevel, supplier, category, entriesPerPage, searchTerm]);



  // --------------------------------------------------
  // EFFECT: load stores for org admins
  // --------------------------------------------------
  useEffect(() => {
    if (!isOrgAdmin) return;
    const loadStores = async () => {
      try {
        const orgId = loggedInUser?.orgId ?? null;
        if (!orgId) {
          setStores([]);
          return;
        }
        const res = await fetch(`/api/stores/by-organization/${orgId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setStores(
            data.map((store) => ({
              id: store.storeId ?? store.id, // Ensure the correct ID field is used
              name: store.storeName ?? store.name ?? `Store ${store.storeId ?? store.id}`, // Ensure the correct name field is used
            }))
          );
        } else {
          setStores([]);
        }
      } catch {
        setStores([]);
      }
    };
    loadStores();
  }, [isOrgAdmin, loggedInUser]);

  // --------------------------------------------------
  // HELPERS: color mapping for stock levels
  // --------------------------------------------------
  // Determine color for a row based on quantity and minimumQuantity
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

  // --------------------------------------------------
  // DATA PROCESSING: client-side filtering and paging
  // --------------------------------------------------
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

  // --------------------------------------------------
  // TABLE ROWS / COLUMNS
  // --------------------------------------------------
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


  const columns = isOrgAdmin
    ? ['Stock Level', 'Store', 'Item Name', 'Category', 'Supplier', 'Unit', 'Quantity']
    : ['Stock Level', 'Item Name', 'Category', 'Supplier', 'Unit', 'Quantity'];

  // --------------------------------------------------
  // TEMPLATE DOWNLOAD / UPLOAD HANDLERS
  // --------------------------------------------------
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

  // Handle file upload
  const [successMessage, setSuccessMessage] = useState("");

  const handleUpload = async () => {
    if (!file || (isOrgAdmin && !storeId)) {
      setInfoModal({
        show: true,
        title: "Missing File or Store",
        message: "Please select a file and a store.",
        onClose: () => setInfoModal({ ...infoModal, show: false }),
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (isOrgAdmin) {
      formData.append("storeId", storeId);
    }

    // Debugging: Log the FormData keys and values
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      const response = await fetch("/api/inventoryitems/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload file.");
      }

      setShowBulkUploadModal(false);
      setInfoModal({
        show: true,
        title: "Upload Successful",
        message: "File uploaded successfully!",
        onClose: () => setInfoModal({ ...infoModal, show: false }),
      });
      setSuccessMessage(""); // Clear legacy success message
    } catch (error) {
      console.error("Error uploading file:", error);
      setInfoModal({
        show: true,
        title: "Upload Failed",
        message: "Failed to upload file. Please try again.",
        onClose: () => setInfoModal({ ...infoModal, show: false }),
      });
    }
  };

  const storeOptions = (stores || []).map(s => ({ label: s.storeName ?? s.name ?? `Store ${s.id}`, value: String(s.storeId ?? s.id) }));

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
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
            title: 'Upload Inventory Items',
            onClick: () => {
              console.log("Bulk Upload button clicked");
              setShowBulkUploadModal(true);
            },
          },
        ]}
      />

          {location.state?.type === "added" && (
              <div className="alert alert-success">
                  {location.state.name} was successfully added.
              </div>
          )}

          {location.state?.type === "updated" && (
              <div className="alert alert-info">
                  {location.state.name} was successfully updated.
              </div>
          )}


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
                  Use this feature to bulk upload inventory items into the system. Please follow the instructions below to ensure a successful upload:
              </p>
              <ul>
                  <li>
                      <strong>Download the Template:</strong> Click the <em>"Download Template"</em> button below to download the Excel template.
                  </li>
                  <li>
                      <strong>Fill Out the Template:</strong> Populate the template with the required data. Ensure the following:
                      <ul>
                          <li><strong>Item Name:</strong> This field is mandatory and must not be empty.</li>
                          <li><strong>Description:</strong> Provide a brief description of the item (optional).</li>
                          <li><strong>Supplier:</strong> Enter the supplier's name. If the supplier does not exist, it will be created automatically.</li>
                          <li><strong>Supplier Contact Method:</strong> Enter the contact method for the supplier (e.g., email, phone).</li>
                          <li><strong>Category:</strong> Select a valid category from the dropdown in the template.</li>
                          <li><strong>Unit:</strong> Select a valid unit from the dropdown in the template.</li>
                          <li><strong>Cost Per Unit:</strong> Enter a numeric value for the cost per unit.</li>
                          <li><strong>Quantity:</strong> Enter a numeric value for the quantity.</li>
                          <li><strong>Threshold:</strong> Enter a numeric value for the minimum quantity threshold.</li>
                      </ul>
                  </li>
                  <li>
                      <strong>Avoid Modifying the Template:</strong> Do not change the structure, headers, or formatting of the template.
                  </li>
                  <li>
                      <strong>Save the File:</strong> Save the file in Excel format (.xlsx) after filling out the data.
                  </li>
                  <li>
                      <strong>Upload the File:</strong> Use the upload feature to submit the file. Ensure the file adheres to the following rules:
                      <ul>
                          <li>The file must be in Excel format (.xlsx).</li>
                          <li>The headers must match the template exactly.</li>
                          <li>Ensure all required fields are filled out correctly.</li>
                      </ul>
                  </li>
              </ul>
              <p>
                  <strong>Note:</strong> If a supplier with the same name and contact method already exists for the store, it will be reused. Otherwise, a new supplier will be created and linked to the inventory item.
              </p>
              <div className="text-end">
                  <button className="btn btn-primary" onClick={handleDownloadTemplate}>
                      Download Template
                  </button>
              </div>

              {/* For organization admins: store selection */}
              {isOrgAdmin && (
                  <div className="mb-3">
                      <label className="form-label">Select Store</label>
                      <SelectField
                          label="Store"
                          value={storeId}
                          onChange={setStoreId}
                          options={[{ label: "Select store", value: "" }, ...storeOptions]}
                          required
                      />
                  </div>
              )}

              {/* File upload section */}
              <div className="mb-3">
                  <label className="form-label">Upload File</label>
                  <input
                      type="file"
                      className="form-control"
                      accept=".xlsx, .xls"
                      onChange={e => setFile(e.target.files[0])}
                  />
              </div>

              {/* Note about file requirements */}
              <div className="mb-3">
                  <small className="text-muted">
                      <strong>File Requirements:</strong> Must be an Excel file (.xlsx or .xls) with the correct format.
                  </small>
              </div>

              {/* Submit button */}
              <div className="text-end">
                  <button className="btn btn-success" onClick={handleUpload}>
                      Upload
                  </button>
              </div>
          </InfoModal>

          {/* InfoModal for upload errors and success */}
          <InfoModal
            show={infoModal.show}
            title={infoModal.title}
            onClose={infoModal.onClose}
          >
            <div>{infoModal.message}</div>
          </InfoModal>
    </div>
  );
};

export default InventoryItemsListPage;
