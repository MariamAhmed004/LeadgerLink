import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import TextArea from "../../components/Form/TextArea";
import FileUploadField from "../../components/Form/FileUploadField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";
import TitledGroup from "../../components/Form/TitledGroup";
import { MdOutlineInventory } from "react-icons/md";
import { useAuth } from "../../Context/AuthContext"; // Import the AuthContext hook

/*
  InventoryEdit.jsx
  Summary:
  - Edit page for a single inventory item. Loads item + lookups, allows editing
    core fields, supplier details and optional product-on-sale settings, then
    submits updates to the server (JSON or multipart when image present).
*/

// --------------------------------------------------
// COMPONENT / STATE
// --------------------------------------------------
const InventoryItemEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth(); // Access the logged-in user from the context

  // --------------------------------------------------
  // PRIMARY FIELDS
  // --------------------------------------------------
  // Editable item name and description
  const [itemName, setItemName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [shortDescription, setShortDescription] = useState("");

  // Existing image preview URL returned by the server
  const [existingImageUrl, setExistingImageUrl] = useState("");

  // --------------------------------------------------
  // SUPPLIERS
  // --------------------------------------------------
  // Assigned supplier id and supplier lookup list
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  // Editable supplier fields (pre-filled when a supplier is chosen)
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editSupplierContact, setEditSupplierContact] = useState("");

  // --------------------------------------------------
  // CATEGORY / UNIT
  // --------------------------------------------------
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState([]);

  // --------------------------------------------------
  // QUANTITY / COST / THRESHOLD
  // --------------------------------------------------
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [threshold, setThreshold] = useState("");

  // --------------------------------------------------
  // PRODUCT DETAILS (UI-only)
  // --------------------------------------------------
  const [isOnSale, setIsOnSale] = useState(false);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [sellingPriceTouched, setSellingPriceTouched] = useState(false);
  const [vatCategoryId, setVatCategoryId] = useState("");
  const [vatCategories, setVatCategories] = useState([]);
  const [productDescription, setProductDescription] = useState("");
  const [vatList, setVatList] = useState([]);
  const [costPrice, setCostPrice] = useState(0);

  // --------------------------------------------------
  // CONTEXT / METADATA
  // --------------------------------------------------
  // Store id captured from the item details (for org admin requests)
  const [fetchedStoreId, setFetchedStoreId] = useState("");

  // Loading / saving / error UI
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track whether the item was originally on sale (server state)
  const [originalOnSale, setOriginalOnSale] = useState(false);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  // minimum text length helper
  const isTextValid = (v) => {
    if (v == null) return false;
    return String(v).trim().length >= 3;
  };

  // parse numeric inputs that may be empty or contain commas
  const parseNonNegativeNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n)) return NaN;
    return n;
  };

  // --------------------------------------------------
  // LOOKUPS / IMAGE LOADERS
  // --------------------------------------------------
  const loadLookups = async () => {
    try {
      const supRes = await fetch("/api/suppliers", { credentials: "include" }).catch(() => null);
      if (supRes && supRes.ok) {
        const data = await supRes.json();
        setSuppliers(data || []);
      }
      const catRes = await fetch("/api/categories", { credentials: "include" }).catch(() => null);
      if (catRes && catRes.ok) {
        const data = await catRes.json();
        setCategories(data || []);
      }
      const lookRes = await fetch("/api/inventoryitems/lookups", { credentials: "include" }).catch(() => null);
      if (lookRes && lookRes.ok) {
        const lookData = await lookRes.json();
        setUnits(lookData.units || []);
        setVatCategories(lookData.vatCategories || []);
        setVatList(lookData.vatCategories || []);
      }
    } catch { /* empty */ }
  };

  // Attempt to detect whether an image exists for this item and set preview URL
  const loadExistingImage = async (itemId) => {
    if (!itemId) { setExistingImageUrl(""); return; }
    try {
      const url = `/api/inventoryitems/${encodeURIComponent(itemId)}/image`;
      // Probe the image exists (don’t block on error)
      const res = await fetch(url, { method: "GET", credentials: "include" }).catch(() => null);
      if (res && res.ok) setExistingImageUrl(url);
      else setExistingImageUrl("");
    } catch {
      setExistingImageUrl("");
    }
  };

  // --------------------------------------------------
  // LOAD ITEM
  // --------------------------------------------------
  const loadItem = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventoryitems/${encodeURIComponent(id)}`, { credentials: "include" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to load item (${res.status})`);
      }
      const it = await res.json();

      // populate form fields from returned DTO
      setItemName(it.inventoryItemName || it.name || "");
      setShortDescription(it.description || "");
      setSupplierId(it.supplierId ? String(it.supplierId) : "");

      // Pre-fill editable supplier fields if API provided them
      setEditSupplierName(it.supplierName || "");
      setEditSupplierContact(it.supplierContact  || "");

      // Ensure category/unit select values match option value types (string)
      setCategoryId(it.categoryId != null ? String(it.categoryId) : "");
      setUnitId(it.unitId != null ? String(it.unitId) : "");

      setQuantity(it.quantity != null ? String(it.quantity) : "");
      setCostPerUnit(it.costPerUnit != null ? String(it.costPerUnit) : "");
      setThreshold(it.minimumQuantity != null ? String(it.minimumQuantity) : "");

      // product
      setOriginalOnSale(Boolean(it.isOnSale || (it.relatedProductsCount > 0)));
      // don't flip UI into on-sale mode automatically; allow explicit user control
      setIsOnSale(false);
      setSellingPrice(it.sellingPrice != null ? String(it.sellingPrice) : "");
      setVatCategoryId(it.vatCategoryId != null ? String(it.vatCategoryId) : "");
      setProductDescription(it.productDescription || "");

      // Capture storeId from the inventory item details (do NOT take from loggedInUser)
      setFetchedStoreId(it.storeId != null ? String(it.storeId) : "");

      // existing image preview
      await loadExistingImage(id);
    } catch (ex) {
      console.error(ex);
      setError(ex.message || "Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { if (id) loadItem(); }, [id]);

  // --------------------------------------------------
  // EFFECT: when supplier selection changes, update editable supplier fields
  // --------------------------------------------------
  useEffect(() => {
    if (!supplierId) {
      setEditSupplierName("");
      setEditSupplierContact("");
      return;
    }
    const s = suppliers.find((x) => String(x.supplierId ?? x.id ?? x.SupplierId) === String(supplierId));
    if (s) {
      setEditSupplierName(s.supplierName ?? s.name ?? "");
      setEditSupplierContact(s.contactMethod ?? "");
    }
  }, [supplierId, suppliers]);

  // --------------------------------------------------
  // VALIDATION / PAYLOAD BUILDING
  // --------------------------------------------------
  const validate = () => {
    const errors = [];
    if (!isTextValid(itemName)) errors.push("Item Name must be at least 3 characters.");
    if (shortDescription && String(shortDescription).trim().length > 0 && !isTextValid(shortDescription))
      errors.push("Short description must be at least 3 characters when provided.");
    const q = parseNonNegativeNumber(quantity);
    if (Number.isNaN(q)) errors.push("Quantity must be a valid number.");
    else if (q != null && q < 0) errors.push("Quantity cannot be negative.");
    const cpu = parseNonNegativeNumber(costPerUnit);
    if (Number.isNaN(cpu)) errors.push("Cost per Unit must be a valid number.");
    else if (cpu != null && cpu < 0) errors.push("Cost per Unit cannot be negative.");
    const th = parseNonNegativeNumber(threshold);
    if (Number.isNaN(th)) errors.push("Threshold must be a valid number.");
    else if (th != null && th < 0) errors.push("Threshold (minimum quantity) cannot be negative.");
    if (!categoryId) errors.push("Category must be selected.");
    return errors;
  };

  const buildPayload = () => {
    const base = {
      inventoryItemName: String(itemName).trim(),
      shortDescription: shortDescription ? String(shortDescription).trim() : null,
      supplierId: supplierId ? Number(supplierId) : null,
      editSupplier: {
        name: editSupplierName ? String(editSupplierName).trim() : null,
        contactMethod: editSupplierContact ? String(editSupplierContact).trim() : null,
      },
      inventoryItemCategoryId: categoryId ? Number(categoryId) : null,
      unitId: unitId ? Number(unitId) : null,
      quantity: (() => { const v = parseNonNegativeNumber(quantity); return v == null ? 0 : v; })(),
      costPerUnit: (() => { const v = parseNonNegativeNumber(costPerUnit); return v == null ? 0 : v; })(),
      minimumQuantity: (() => { const v = parseNonNegativeNumber(threshold); return v == null ? null : v; })(),
    };
    if (isOnSale) {
      const sp = parseNonNegativeNumber(sellingPrice);
      const vat = vatCategoryId ? Number(vatCategoryId) : null;
      return {
        ...base,
        isOnSale: true,
        sellingPrice: sp == null ? null : Number(Number(sp).toFixed(3)),
        vatCategoryId: vat,
        costPrice: Number(Number(costPrice).toFixed(3)),
        productDescription: productDescription ? String(productDescription).trim() : null,
      };
    }
    return { ...base, isOnSale: false };
  };

  // --------------------------------------------------
  // SUBMIT: send updates (JSON or multipart)
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const errors = validate();
    if (errors.length > 0) { setError(errors.join(" ")); return; }
    setSaving(true);
    const payload = buildPayload();

    try {
      // Construct API URL, append fetched storeId only when logged-in user is Organization Admin
      let apiUrl = `/api/inventoryitems/${encodeURIComponent(id)}`;
      if (loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin")) {
        if (fetchedStoreId) {
          apiUrl += `?storeId=${encodeURIComponent(fetchedStoreId)}`;
        } else {
          // If inventory details did not include a storeId, fail early rather than guessing from user context
          throw new Error("Unable to determine store ID from inventory details.");
        }
      }

      const res = imageFile ? await submitMultipart(payload, apiUrl) : await submitJson(payload, apiUrl);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }
      navigate("/inventory");
    } catch (err) {
      console.error(err);
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitJson = async (payload, apiUrl) => {
    const url = apiUrl || `/api/inventoryitems/${encodeURIComponent(id)}`;
    return fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const submitMultipart = async (payload, apiUrl) => {
    const fd = new FormData();
    fd.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }), "payload.json");
    if (imageFile) fd.append("image", imageFile);
    const url = apiUrl || `/api/inventoryitems/${encodeURIComponent(id)}`;
    return fetch(url, {
      method: "PUT",
      credentials: "include",
      body: fd,
    });
  };

  // --------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------
  const mapOptions = (items, labelKey, valueKey) => (items || []).map((i) => ({ label: i[labelKey] ?? i.name ?? i.unitName ?? String(i), value: String(i[valueKey] ?? i.id ?? i.unitId ?? "") }));

  const productActions = originalOnSale ? (
    <div className="d-flex align-items-center gap-2">
      {/* Use product id when known in future; for now redirect to product list/edit accordingly */}
      <a className="btn btn-dark btn-sm" href={`/products`}>Edit Product</a>
      <button className="btn btn-dark btn-sm" type="button" onClick={() => alert('Remove from sale not implemented yet')}>Remove Item from Sale</button>
    </div>
  ) : null;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader icon={<MdOutlineInventory size={55} />} title="Edit Inventory Item" descriptionLines={["Edit item details, image and assignments.", "Change assigned supplier via select, or edit the current supplier details below."]} actions={[]} />

      {loading ? (
        <div className="alert alert-info">Loading...</div>
      ) : (
        <FormBody onSubmit={handleSubmit} plain={true}>
          <div className="row gx-4 gy-4">
            <div className="col-12 text-start">
              <InputField label="Item Name" required value={itemName} onChange={setItemName} placeholder="Item name" />
            </div>

            <div className="col-12 ">
              <FileUploadField label="Replace Item Image" onChange={setImageFile} accept="image/*" />
              {existingImageUrl && !imageFile && (
                <div className="mt-2">
                  <img src={existingImageUrl} alt="Existing Item" style={{ maxWidth: "220px", maxHeight: "160px", objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}
            </div>

            <div className="col-12 text-start">
              <TextArea label="Item Description" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="Item description" />
            </div>

            <div className="col-12 col-md-6 text-start">
              <SelectField searchable label="Assigned Supplier" value={supplierId} onChange={(v) => setSupplierId(v)} options={[{ label: "Select supplier", value: "" }, ...mapOptions(suppliers, "supplierName", "supplierId")]} />
            </div>

            {/* Removed Supplier Contact display block */}

            <div className="col-12">
              <TitledGroup title="Edit Supplier Details">
                {/* Note: editing supplier details here updates the supplier entity itself.
                    These changes will propagate to all items linked to this supplier across the system. */}
                <div className="alert alert-secondary alert-dismissible fade show text-start mb-3" role="alert">
                  <strong>Warning: </strong>Changing the supplier's name or contact info will update that supplier globally.
                  All inventory items assigned to this supplier will reflect the updated details.
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
                <div className="row gx-3 gy-3">
                  <div className="col-12 col-md-6">
                    <InputField label="Supplier Name" value={editSupplierName} onChange={setEditSupplierName} placeholder="Supplier name" />
                  </div>
                  <div className="col-12 col-md-6">
                    <InputField label="Supplier Contact" value={editSupplierContact} onChange={setEditSupplierContact} placeholder="e.g. email or phone" />
                  </div>
                </div>
              </TitledGroup>
            </div>

            <div className="col-12 col-md-6 text-start">
              <SelectField label="Category" value={categoryId} onChange={(v) => setCategoryId(v)} options={[{ label: "Select category", value: "" }, ...mapOptions(categories, "name", "categoryId")] } required />
            </div>
            <div className="col-12 col-md-6 text-start" />

            <div className="col-12 col-md-6 text-start">
              <SelectField label="Unit" value={unitId} onChange={(v) => setUnitId(v)} options={[{ label: "Select unit", value: "" }, ...mapOptions(units, "unitName", "unitId")] } />
            </div>
            <div className="col-12 col-md-6 text-start">
              <InputField label="Cost per Unit" value={costPerUnit} onChange={setCostPerUnit} type="number" step="0.001" placeholder="0.000" />
            </div>

            <div className="col-12 col-md-6 text-start">
              <InputField label="Quantity" type="number" value={quantity} onChange={setQuantity} placeholder="0.00" />
            </div>
            <div className="col-12 col-md-6 text-start">
              <InputField label="Threshold (Reorder level)" value={threshold} onChange={setThreshold} type="number" placeholder="0" />
            </div>

            {/* Product Details box */}
            <div className="col-12 mt-5">
              <TitledGroup title="Product Details" subtitle={originalOnSale ? "Manage sale-related actions" : "Set item on sale"}>
                {originalOnSale ? (
                  <div className="row gx-3 gy-3">
                    <div className="col-12">
                      <div className="alert alert-light mb-3 text-start">
                        <strong>Use "Edit Product"</strong> to update sale-related settings (price, VAT, etc.) for the product linked to this item.
                        <strong> "Remove Item from Sale"</strong> will stop selling this item as a product; the product record won't be deleted now.
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        {productActions}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="row gx-3 gy-3">
                    <div className="col-12 d-flex align-items-center gap-3">
                                                  <div className="flex-shrink-0 col-md-6 align-items-center mt-3">
                        <SwitchField label="Set On Sale" checked={isOnSale} onChange={setIsOnSale} />
                      </div>
                                                  <div className="flex-grow-1 col-md-6">
                        <SelectField
                          label="VAT Category"
                          value={vatCategoryId}
                          onChange={(v) => setVatCategoryId(v)}
                          options={[{ label: "Select VAT category", value: "" }, ...mapOptions(vatCategories, "label", "id")]}
                        />
                      </div>
                    </div>

                    {isOnSale && (
                      <>
                        <div className="col-12 col-md-6 text-start">
                          <InputField
                            label="Selling Price"
                            value={sellingPrice ? Number(sellingPrice).toFixed(3) : "0.000"}
                            onChange={(v) => { const num = Number(String(v).replace(/[^0-9.-]/g, "")) || 0; setSellingPrice(num); setSellingPriceTouched(true); }}
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                          />
                        </div>
                        <div className="col-12 col-md-6 text-start">
                          <InputField
                            label="Cost Price (BHD)"
                            value={costPrice != null ? Number(costPrice).toFixed(3) : ""}
                            readOnly
                            disabled
                            placeholder="XX.XXX BHD"
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        </div>
                        <div className="col-12">
                          <TextArea
                            label="Sale Description (optional)"
                            value={productDescription}
                            onChange={setProductDescription}
                            rows={4}
                            placeholder="Describe the product for sale"
                          />
                        </div>
                      </>
                    )}
                    <div className="col-12">
                      <div className="alert alert-secondary text-start">
                        To put the item on sale, enable "Set On Sale", then select VAT category and provide a selling price. These values are saved when you click Save Changes.
                      </div>
                    </div>
                  </div>
                )}
              </TitledGroup>
            </div>

            <div className="col-12 d-flex justify-content-end">
              <FormActions onCancel={() => navigate("/inventory")} submitLabel="Save Changes" loading={saving} />
            </div>

            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            )}
          </div>
        </FormBody>
      )}
    </div>
  );
};

export default InventoryItemEdit;
