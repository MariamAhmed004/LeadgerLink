import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const InventoryItemNew = () => {
  const navigate = useNavigate();

  // Primary fields
  const [itemName, setItemName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [shortDescription, setShortDescription] = useState("");

  // Suppliers
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [selectedSupplierContactMethod, setSelectedSupplierContactMethod] = useState("");

  // Category / Unit
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState([]);

  // Quantity & cost & threshold
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [threshold, setThreshold] = useState("");

  // UI-only: Product details (not used in submit logic per request)
  const [isOnSale, setIsOnSale] = useState(false);
  const [sellingPrice, setSellingPrice] = useState("");
  const [vatCategoryId, setVatCategoryId] = useState("");
  const [vatCategories, setVatCategories] = useState([]);
  const [productDescription, setProductDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Helpers
  const isTextValid = (v) => {
    if (v == null) return false;
    return String(v).trim().length >= 3;
  };

  const parseNonNegativeNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n)) return NaN;
    return n;
  };

  const loadLookups = async () => {
    try {
      const supRes = await fetch("/api/suppliers", { credentials: "include" }).catch(() => null);
      if (supRes && supRes.ok) {
        const data = await supRes.json();
        setSuppliers(data || []);
      } else {
        setSuppliers([]);
      }

      const catRes = await fetch("/api/categories", { credentials: "include" }).catch(() => null);
      if (catRes && catRes.ok) {
        const data = await catRes.json();
        setCategories(data || []);
      } else {
        setCategories([]);
      }

      const lookRes = await fetch("/api/inventoryitems/lookups", { credentials: "include" }).catch(() => null);
      if (lookRes && lookRes.ok) {
        const lookData = await lookRes.json();
        setUnits(lookData.units || []);
        // vatCategories are loaded for UI only (they won't be submitted per request)
        setVatCategories(lookData.vatCategories || []);
      } else {
        setUnits([]);
        setVatCategories([]);
      }
    } catch (ex) {
      console.error(ex);
      setSuppliers([]);
      setCategories([]);
      setUnits([]);
      setVatCategories([]);
    }
  };

  useEffect(() => { loadLookups(); }, []);

  useEffect(() => {
    if (!supplierId) { setSelectedSupplierContactMethod(""); return; }
    const s = suppliers.find((x) => String(x.supplierId ?? x.id ?? x.SupplierId) === String(supplierId));
    setSelectedSupplierContactMethod(s ? (s.contactMethod ?? s.contact_method ?? s.ContactMethod ?? "") : "");
  }, [supplierId, suppliers]);

  const validate = () => {
    const errors = [];

    if (!isTextValid(itemName)) errors.push("Item Name must be at least 3 characters.");

    if (shortDescription && String(shortDescription).trim().length > 0 && !isTextValid(shortDescription))
      errors.push("Short description must be at least 3 characters when provided.");

    const hasSelectedSupplier = !!supplierId;
    const hasNewSupplierName = String(newSupplierName ?? "").trim().length > 0;
    const hasNewSupplierContact = String(newSupplierContact ?? "").trim().length > 0;

    if (!hasSelectedSupplier) {
      if (!hasNewSupplierName || !hasNewSupplierContact) {
        errors.push("Provide an existing supplier or enter both New Supplier Name and New Supplier Contact (each >= 3 chars).");
      } else {
        if (!isTextValid(newSupplierName)) errors.push("New Supplier Name must be at least 3 characters.");
        if (!isTextValid(newSupplierContact)) errors.push("New Supplier Contact must be at least 3 characters.");
      }
    }

    const q = parseNonNegativeNumber(quantity);
    if (q === NaN) errors.push("Quantity must be a valid number.");
    else if (q != null && q < 0) errors.push("Quantity cannot be negative.");

    const cpu = parseNonNegativeNumber(costPerUnit);
    if (cpu === NaN) errors.push("Cost per Unit must be a valid number.");
    else if (cpu != null && cpu < 0) errors.push("Cost per Unit cannot be negative.");

    const th = parseNonNegativeNumber(threshold);
    if (th === NaN) errors.push("Threshold must be a valid number.");
    else if (th != null && th < 0) errors.push("Threshold (minimum quantity) cannot be negative.");

    if (!categoryId) errors.push("Category must be selected.");

    return errors;
  };

  const buildPayload = () => {
    const base = {
      inventoryItemName: String(itemName).trim(),
      shortDescription: shortDescription ? String(shortDescription).trim() : null,
      supplierId: supplierId ? Number(supplierId) : null,
      newSupplier: {
        name: newSupplierName ? String(newSupplierName).trim() : null,
        contactMethod: newSupplierContact ? String(newSupplierContact).trim() : null,
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
        productDescription: productDescription ? String(productDescription).trim() : null,
      };
    }

    return { ...base, isOnSale: false };
  };

  const submitJson = async (payload) => {
    return fetch("/api/inventoryitems", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const submitMultipart = async (payload) => {
    const fd = new FormData();
    // Append payload JSON with a filename to ensure form field is recognized
    fd.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }), "payload.json");
    if (imageFile) fd.append("image", imageFile);
    return fetch("/api/inventoryitems", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = validate();
    if (errors.length > 0) { setError(errors.join(" ")); return; }

    setSaving(true);
    const payload = buildPayload();

    try {
      const res = imageFile ? await submitMultipart(payload) : await submitJson(payload);
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

  const mapOptions = (items, labelKey, valueKey) => (items || []).map((i) => ({ label: i[labelKey] ?? i.name ?? i.unitName ?? String(i), value: String(i[valueKey] ?? i.id ?? i.unitId ?? "") }));

  const supplierContactDisplay = selectedSupplierContactMethod || "";

  return (
    <div className="container py-5">
      <PageHeader icon={<MdOutlineInventory size={55} />} title="Add Inventory Item" descriptionLines={["Fill In the form to add a new item to the entry.", "You can add an image optionally", "If the supplier is added before you can select it from the list, if not add it", "You can set the item on sale and input the VAT Category"]} actions={[]} />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 text-start">
            <InputField label="Item Name" required value={itemName} onChange={setItemName} placeholder="Item name" />
          </div>

          <div className="col-12 ">
            <FileUploadField label="Item Image" onChange={setImageFile} accept="image/*" />
          </div>

          <div className="col-12 text-start">
            <TextArea label="Item Description" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="Item description" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField searchable label="Supplier" value={supplierId} onChange={(v) => setSupplierId(v)} options={[{ label: "Select supplier", value: "" }, ...mapOptions(suppliers, "supplierName", "supplierId")]} />
          </div>
          <div className="col-12 col-md-6 text-start d-flex align-items-end">
            <div>
              <div className="form-label mb-1">Supplier Contact</div>
              <div className="small text-muted">{supplierContactDisplay || "No contact info"}</div>
            </div>
          </div>

          <div className="col-12">
            <TitledGroup title="Add New Supplier">
              <div className="row gx-3 gy-3">
                <div className="col-12 col-md-6">
                  <InputField label="New Supplier Name" value={newSupplierName} onChange={setNewSupplierName} placeholder="Supplier name" />
                </div>
                <div className="col-12 col-md-6">
                  <InputField label="New Supplier Contact" value={newSupplierContact} onChange={setNewSupplierContact} placeholder="e.g. email or phone" />
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

          {/* UI-only Product Details box */}
          <div className="col-12 mt-5">
            <TitledGroup title="Product Details" subtitle="Sale flag, VAT, selling price and description">
              <div className="row gx-3 gy-3">
                <div className="col-12">
                  <div className="col-12 col-md-4">
                    <SwitchField label="Set On Sale" checked={isOnSale} onChange={setIsOnSale} />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <SelectField label="VAT Category" value={vatCategoryId} onChange={(v) => setVatCategoryId(v)} options={[{ label: "Select VAT category", value: "" }, ...mapOptions(vatCategories, "label", "id")] } />
                </div>
                <div className="col-12 col-md-6">
                  <InputField label="Selling Price" value={sellingPrice} onChange={setSellingPrice} type="number" step="0.001" placeholder="0.000" />
                </div>
                <div className="col-12">
                  <TextArea label="Product Description" value={productDescription} onChange={setProductDescription} rows={4} placeholder="Full product description" />
                </div>
              </div>
            </TitledGroup>
          </div>

          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate("/inventory")} submitLabel="Save Item" loading={saving} />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}
        </div>
      </FormBody>
    </div>
  );
};

export default InventoryItemNew;