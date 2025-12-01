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
import { FaBox } from "react-icons/fa";

/*
  Revised Inventory Item form layout per request:

  Row 1: [ Item Name | Image Upload ]
  Row 2: [ Description (text area) ]
  Row 3: [ Supplier select (with contact-method span beside) ]
  Row 4: [ If 'Add new supplier' selected -> Supplier Name | Supplier Contact Method ]
  Row 5: [ Category select | Unit select ]
  Row 6: [ Quantity input (show unit label beside) ]
  Row 7: [ Cost per unit | Threshold (reorder level) ]
  Row 8: [ Switch: Set On Sale | VAT Category select ]
  Row 9: [ Product Description (text area) ]
  Row 10: [ Actions ]
*/

const InventoryItemNew = () => {
  const navigate = useNavigate();

  // Primary fields
  const [itemName, setItemName] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [shortDescription, setShortDescription] = useState("");

  // Suppliers
  const [supplierId, setSupplierId] = useState(""); // "" = none, "new" = add new
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [selectedSupplierContactMethod, setSelectedSupplierContactMethod] = useState("");

  // Category / Unit
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState([]);

  // Quantity
  const [quantity, setQuantity] = useState("");

  // Cost & threshold
  const [costPerUnit, setCostPerUnit] = useState("");
  const [threshold, setThreshold] = useState("");

  // On sale + VAT
  const [isOnSale, setIsOnSale] = useState(false);
  const [vatCategoryId, setVatCategoryId] = useState("");
  const [vatCategories, setVatCategories] = useState([]);

  // Product description
  const [productDescription, setProductDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        // Suppliers
        const supRes = await fetch("/api/suppliers", { credentials: "include" }).catch(() => null);
        if (supRes && supRes.ok) {
          const data = await supRes.json();
          setSuppliers(data || []);
        } else {
          setSuppliers([
            { supplierId: 1, supplierName: "Supplier A", contactMethod: "email: a@example.com" },
            { supplierId: 2, supplierName: "Supplier B", contactMethod: "phone: +973-XXXXX" },
          ]);
        }

        // Categories
        const catRes = await fetch("/api/categories", { credentials: "include" }).catch(() => null);
        if (catRes && catRes.ok) {
          const data = await catRes.json();
          setCategories(data || []);
        } else {
          setCategories([{ categoryId: 1, name: "General" }, { categoryId: 2, name: "Perishables" }]);
        }

        // Units
        const unitRes = await fetch("/api/units", { credentials: "include" }).catch(() => null);
        if (unitRes && unitRes.ok) {
          const udata = await unitRes.json();
          setUnits(udata || []);
        } else {
          setUnits([{ unitId: 1, unitName: "pcs" }, { unitId: 2, unitName: "kg" }]);
        }

        // VAT categories
        const vatRes = await fetch("/api/vatcategories", { credentials: "include" }).catch(() => null);
        if (vatRes && vatRes.ok) {
          const vdata = await vatRes.json();
          setVatCategories(vdata || []);
        } else {
          setVatCategories([
            { id: "none", label: "No VAT" },
            { id: "standard", label: "Standard VAT" },
          ]);
        }
      } catch (ex) {
        console.error(ex);
      }
    };

    loadLookups();
  }, []);

  // update selected supplier contact method when supplier changes
  useEffect(() => {
    if (!supplierId || supplierId === "new") {
      setSelectedSupplierContactMethod("");
      return;
    }

    const s = suppliers.find(
      (x) => String(x.supplierId ?? x.id ?? x.SupplierId) === String(supplierId)
    );
    setSelectedSupplierContactMethod(s ? (s.contactMethod ?? s.contact_method ?? s.ContactMethod ?? "") : "");
  }, [supplierId, suppliers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      inventoryItemName: itemName,
      shortDescription: shortDescription || null,
      // supplier: either existing id or new supplier details
      supplierId: supplierId && supplierId !== "new" ? Number(supplierId) : null,
      newSupplier: supplierId === "new" ? { name: newSupplierName || null, contactMethod: newSupplierContact || null } : null,
      inventoryItemCategoryId: categoryId ? Number(categoryId) : null,
      unitId: unitId ? Number(unitId) : null,
      quantity: quantity ? Number(quantity) : 0,
      costPerUnit: costPerUnit ? Number(costPerUnit) : 0,
      minimumQuantity: threshold ? Number(threshold) : null,
      isOnSale: !!isOnSale,
      vatCategoryId: vatCategoryId || null,
      productDescription: productDescription || null,
    };

    try {
      let res;
      if (imageFile) {
        const fd = new FormData();
        fd.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        fd.append("image", imageFile);
        res = await fetch("/api/inventoryitems", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else {
        res = await fetch("/api/inventoryitems", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

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

  // Helper to build select options
  const mapOptions = (items, labelKey, valueKey) =>
    (items || []).map((i) => ({ label: i[labelKey] ?? i.name ?? i.unitName ?? String(i), value: String(i[valueKey] ?? i.id ?? i.unitId ?? "") }));

  return (
    <div className="container py-5">
      <PageHeader icon={<FaBox size={28} />} title="Add Inventory Item" descriptionLines={["Add a new inventory item."]} actions={[]} />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: Item Name | Image Upload */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Item Name" required value={itemName} onChange={setItemName} placeholder="Item name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <FileUploadField label="Item Image" onChange={setImageFile} accept="image/*" />
          </div>

          {/* Row 2: Short Description */}
          <div className="col-12 text-start">
            <TextArea label="Short Description" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="Short description" />
          </div>

          {/* Row 3: Supplier select with contact method span */}
          <div className="col-12 col-md-6 text-start">
            <label className="form-label">Supplier</label>
            <div className="d-flex align-items-center gap-3">
              <SelectField
                label="" // label rendered above, pass empty to avoid duplicate
                value={supplierId}
                onChange={(v) => setSupplierId(v)}
                options={[
                  { label: "Select supplier", value: "" },
                  ...mapOptions(suppliers, "supplierName", "supplierId"),
                  { label: "Add New Supplier", value: "new" },
                ]}
              />
              <div className="small text-muted" style={{ minWidth: 160 }}>
                {supplierId && supplierId !== "new" ? (selectedSupplierContactMethod || "No contact info") : supplierId === "new" ? "Adding new supplier" : ""}
              </div>
            </div>
          </div>

          {/* Row 4: new supplier name + contact (only when adding new) */}
          {supplierId === "new" && (
            <>
              <div className="col-12 col-md-6 text-start">
                <InputField label="New Supplier Name" value={newSupplierName} onChange={setNewSupplierName} placeholder="Supplier name" />
              </div>
              <div className="col-12 col-md-6 text-start">
                <InputField label="New Supplier Contact Method" value={newSupplierContact} onChange={setNewSupplierContact} placeholder="e.g. email or phone" />
              </div>
            </>
          )}

          {/* Row 5: Category | Unit */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Category"
              value={categoryId}
              onChange={(v) => setCategoryId(v)}
              options={[{ label: "Select category", value: "" }, ...mapOptions(categories, "name", "categoryId")]}
              required
            />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Unit"
              value={unitId}
              onChange={(v) => setUnitId(v)}
              options={[{ label: "Select unit", value: "" }, ...mapOptions(units, "unitName", "unitId")]}
            />
          </div>

          {/* Row 6: Quantity with unit displayed */}
          <div className="col-12 col-md-6 text-start">
            <label className="form-label">Quantity</label>
            <div className="d-flex align-items-center gap-2">
              <InputField label="" value={quantity} onChange={setQuantity} type="number" placeholder="0.00" />
              <div className="small text-muted" style={{ minWidth: 80 }}>
                {unitId ? (units.find((u) => String(u.unitId ?? u.id) === String(unitId))?.unitName ?? "") : ""}
              </div>
            </div>
          </div>

          {/* Row 7: Cost per unit | Threshold */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Cost per Unit" value={costPerUnit} onChange={setCostPerUnit} type="number" step="0.001" placeholder="0.000" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Threshold (Reorder level)" value={threshold} onChange={setThreshold} type="number" placeholder="0" />
          </div>

          {/* Row 8: Switch for On Sale | VAT Category */}
          <div className="col-12 col-md-6 text-start d-flex align-items-center">
            <SwitchField label="Set On Sale" checked={isOnSale} onChange={setIsOnSale} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="VAT Category"
              value={vatCategoryId}
              onChange={(v) => setVatCategoryId(v)}
              options={[{ label: "Select VAT category", value: "" }, ...mapOptions(vatCategories, "label", "id")]}
            />
          </div>

          {/* Row 9: Product Description */}
          <div className="col-12 text-start">
            <TextArea label="Product Description" value={productDescription} onChange={setProductDescription} rows={4} placeholder="Full product description" />
          </div>

          {/* Row 10: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate("/inventory")} submitLabel="Save Item" loading={saving} />
          </div>

          {/* Error */}
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