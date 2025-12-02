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
import TitledGroup from "../../components/Form/TitledGroup";

/*
  Revised Inventory Item form layout:
  - Keep labels as-is (above inputs).
  - Supplier select + contact remain as before.
  - Unit + Cost per Unit share a row.
  - Quantity + Threshold share the row below them.
  - Image upload uses FileUploadField's built-in preview (no duplicate preview box).
  - Switch, VAT and Product Description grouped in a titled box.
*/

const InventoryItemNew = () => {
  const navigate = useNavigate();

  // Primary fields
  const [itemName, setItemName] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [shortDescription, setShortDescription] = useState("");

  // Suppliers
  const [supplierId, setSupplierId] = useState(""); // "" = none
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
        // Suppliers (same as before)
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

        // Categories (same)
        const catRes = await fetch("/api/categories", { credentials: "include" }).catch(() => null);
        if (catRes && catRes.ok) {
          const data = await catRes.json();
          setCategories(data || []);
        } else {
          setCategories([{ categoryId: 1, name: "General" }, { categoryId: 2, name: "Perishables" }]);
        }

        // Combined lookups for units + vatCategories via inventoryitems controller
        const lookRes = await fetch("/api/inventoryitems/lookups", { credentials: "include" }).catch(() => null);
        if (lookRes && lookRes.ok) {
          const lookData = await lookRes.json();
          // lookData.units -> [{ unitId, unitName }]
          // lookData.vatCategories -> [{ id, label, rate }]
          setUnits(lookData.units || []);
          setVatCategories(lookData.vatCategories || []);
        } else {
          // fallback
          setUnits([{ unitId: 1, unitName: "pcs" }, { unitId: 2, unitName: "kg" }]);
          setVatCategories([
            { id: "none", label: "No VAT" },
            { id: "standard", label: "Standard VAT" },
          ]);
        }
      } catch (ex) {
        console.error(ex);
        // safe fallbacks
        setUnits([{ unitId: 1, unitName: "pcs" }, { unitId: 2, unitName: "kg" }]);
        setVatCategories([
          { id: "none", label: "No VAT" },
          { id: "standard", label: "Standard VAT" },
        ]);
      }
    };

    loadLookups();
  }, []);

  // update selected supplier contact method when supplier changes
  useEffect(() => {
    if (!supplierId) {
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
      supplierId: supplierId ? Number(supplierId) : null,
      // include new supplier fields (server will decide to create if supplierId is null and newSupplier provided)
      newSupplier: { name: newSupplierName || null, contactMethod: newSupplierContact || null },
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

  // lookup display strings
  const supplierContactDisplay = selectedSupplierContactMethod || "";

  return (
    <div className="container py-5">
      <PageHeader icon={<FaBox size={28} />} title="Add Inventory Item" descriptionLines={["Add a new inventory item."]} actions={[]} />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: Item Name */}
          <div className="col-12 text-start">
            <InputField label="Item Name" required value={itemName} onChange={setItemName} placeholder="Item name" />
          </div>

          {/* Row 2: Image upload (own row) - use FileUploadField's built-in preview */}
          <div className="col-12 ">
            <FileUploadField label="Item Image" onChange={setImageFile} accept="image/*" />
          </div>

          {/* Row 3: Description (full width) */}
          <div className="col-12 text-start">
            <TextArea label="Item Description" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="Item description" />
          </div>

          {/* Row 4: Supplier select + contact display (same row) */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              searchable
              label="Supplier"
              value={supplierId}
              onChange={(v) => setSupplierId(v)}
              options={[
                { label: "Select supplier", value: "" },
                ...mapOptions(suppliers, "supplierName", "supplierId"),
              ]}
            />
          </div>
          <div className="col-12 col-md-6 text-start d-flex align-items-end">
            <div>
              <div className="form-label mb-1">Supplier Contact</div>
              <div className="small text-muted">{supplierContactDisplay || "No contact info"}</div>
            </div>
          </div>

          {/* Row 4.1: New supplier group */}
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

          {/* Row 5: Category */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Category"
              value={categoryId}
              onChange={(v) => setCategoryId(v)}
              options={[{ label: "Select category", value: "" }, ...mapOptions(categories, "name", "categoryId")]}
              required
            />
          </div>
          <div className="col-12 col-md-6 text-start">{/* intentionally left empty */}</div>

          {/* Row 6: Unit (left) | Cost per Unit (right) */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Unit"
              value={unitId}
              onChange={(v) => setUnitId(v)}
              options={[{ label: "Select unit", value: "" }, ...mapOptions(units, "unitName", "unitId")]}
            />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Cost per Unit" value={costPerUnit} onChange={setCostPerUnit} type="number" step="0.001" placeholder="0.000" />
          </div>

          {/* Row 7: Quantity (left) | Threshold (right) */}
          <div className="col-12 col-md-6 text-start">
            <InputField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={setQuantity}
              placeholder="0.00"
            />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Threshold (Reorder level)" value={threshold} onChange={setThreshold} type="number" placeholder="0" />
          </div>

          {/* Row 8: Product details - grouped in titled box */}
          <div className="col-12 mt-5">
            <TitledGroup title="Product Details" subtitle="Sale flag, VAT and description">
              <div className="row gx-3 gy-3">
                <div className="col-12 col-md-4 mt-5">
                  <SwitchField label="Set On Sale" checked={isOnSale} onChange={setIsOnSale} />
                </div>

                <div className="col-12 col-md-8">
                  <SelectField
                    label="VAT Category"
                    value={vatCategoryId}
                    onChange={(v) => setVatCategoryId(v)}
                    options={[{ label: "Select VAT category", value: "" }, ...mapOptions(vatCategories, "label", "id")]}
                  />
                </div>

                <div className="col-12">
                  <TextArea label="Product Description" value={productDescription} onChange={setProductDescription} rows={4} placeholder="Full product description" />
                </div>
              </div>
            </TitledGroup>
          </div>

          {/* Row 9: Actions */}
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