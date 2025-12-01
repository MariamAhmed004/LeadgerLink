import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import TabbedMenu from "../../components/Form/TabbedMenu";
import MenuTabCard from "../../components/Form/MenuTabCard";
import TimestampField from "../../components/Form/TimestampField";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import TextArea from "../../components/Form/TextArea";
import FileUploadField from "../../components/Form/FileUploadField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";
import { FaBox } from "react-icons/fa";

/*
  Inventory Item form layout:
  Rows:
    1 - text field + image upload
    2 - text area
    3 - select field
    4 - select field
    5 - two input fields
    6 - two input fields
    7 - two input fields
    8 - two input fields
    9 - switch + input field
    10 - text area
    11 - action buttons
*/

const InventoryItemNew = () => {
  const navigate = useNavigate();

  // primary fields
  const [itemName, setItemName] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [shortDescription, setShortDescription] = useState("");

  const [categoryId, setCategoryId] = useState(null);
  const [subCategoryId, setSubCategoryId] = useState(null);

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");

  const [reorderLevel, setReorderLevel] = useState("");
  const [maxStock, setMaxStock] = useState("");

  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("");

  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const [isActive, setIsActive] = useState(true);
  const [openingQty, setOpeningQty] = useState("");

  const [notes, setNotes] = useState("");

  // helper lists (placeholder / loaded from API)
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        // placeholder: categories endpoint; change to your real endpoints later
        const catRes = await fetch("/api/categories", { credentials: "include" }).catch(() => null);
        if (catRes && catRes.ok) {
          const data = await catRes.json();
          setCategories(data || []);
        } else {
          setCategories([{ categoryId: 1, name: "General" }, { categoryId: 2, name: "Perishables" }]);
        }

        // placeholder subcategories
        const subRes = await fetch("/api/subcategories", { credentials: "include" }).catch(() => null);
        if (subRes && subRes.ok) {
          const sdata = await subRes.json();
          setSubCategories(sdata || []);
        } else {
          setSubCategories([{ subCategoryId: 1, name: "Default" }]);
        }
      } catch (ex) {
        console.error(ex);
        setCategories([{ categoryId: 1, name: "General" }]);
        setSubCategories([{ subCategoryId: 1, name: "Default" }]);
      }
    };

    loadLookups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: itemName,
      timestamp: new Date().toISOString(),
      categoryId: categoryId ?? null,
      subCategoryId: subCategoryId ?? null,
      sku: sku || null,
      barcode: barcode || null,
      quantity: openingQty ? Number(openingQty) : 0,
      unit: unit || null,
      weight: weight ? Number(weight) : null,
      costPrice: costPrice ? Number(costPrice) : 0,
      sellingPrice: sellingPrice ? Number(sellingPrice) : 0,
      reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
      maxStock: maxStock ? Number(maxStock) : 0,
      isActive: !!isActive,
      shortDescription: shortDescription || null,
      notes: notes || null,
    };

    try {
      // if image included send FormData
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
        const txt = await res.text();
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

  // simple sample tabs for preview (reuse MenuTabCard)
  const sampleA = [
    { name: "Sample A", description: "Example item A", price: "1.000 BHD", quantity: 10, onSelect: () => {}, isSelected: false },
  ];
  const sampleB = [
    { name: "Box", description: "Packaging box", price: "0.200 BHD", quantity: 100, onSelect: () => {}, isSelected: false },
  ];
  const tabs = [
    { label: "Items", items: sampleA, cardComponent: (item) => <MenuTabCard data={item} /> },
    { label: "Accessories", items: sampleB, cardComponent: (item) => <MenuTabCard data={item} /> },
  ];

  return (
    <div className="container py-5">
      <PageHeader icon={<FaBox size={28} />} title="Add Inventory Item" descriptionLines={["Add a new inventory item."]} actions={[]} />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: text field + image upload */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Item Name" required value={itemName} onChange={setItemName} placeholder="Item name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <FileUploadField label="Item Image" onChange={setImageFile} accept="image/*" />
          </div>

          {/* Row 2: text area */}
          <div className="col-12 text-start">
            <TextArea label="Short Description" value={shortDescription} onChange={setShortDescription} rows={3} placeholder="Short description" />
          </div>

          {/* Row 3: select field */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Category"
              required
              value={categoryId ?? ""}
              onChange={(v) => setCategoryId(v === "" ? null : Number(v))}
              options={[{ label: "Select category", value: "" }, ...categories.map((c) => ({ label: c.name ?? c.categoryName ?? c.CategoryName, value: String(c.categoryId ?? c.id ?? "") }))]}
            />
          </div>

          {/* Row 4: select field */}
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Subcategory"
              required={false}
              value={subCategoryId ?? ""}
              onChange={(v) => setSubCategoryId(v === "" ? null : Number(v))}
              options={[{ label: "Select subcategory", value: "" }, ...subCategories.map((s) => ({ label: s.name ?? s.subCategoryName ?? s.SubCategoryName, value: String(s.subCategoryId ?? s.id ?? "") }))]}
            />
          </div>

          {/* Row 5: two input fields */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="SKU" value={sku} onChange={setSku} placeholder="SKU" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Barcode" value={barcode} onChange={setBarcode} placeholder="Barcode" />
          </div>

          {/* Row 6: two input fields */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Reorder Level" type="number" value={reorderLevel} onChange={setReorderLevel} placeholder="0" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Max Stock" type="number" value={maxStock} onChange={setMaxStock} placeholder="0" />
          </div>

          {/* Row 7: two input fields */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Weight" type="number" step="0.01" value={weight} onChange={setWeight} placeholder="Weight" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. kg, pcs" />
          </div>

          {/* Row 8: two input fields */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Cost Price" type="number" step="0.001" value={costPrice} onChange={setCostPrice} placeholder="0.000" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Selling Price" type="number" step="0.001" value={sellingPrice} onChange={setSellingPrice} placeholder="0.000" />
          </div>

          {/* Row 9: switch + input */}
          <div className="col-12 col-md-6 text-start d-flex flex-column">
            <SwitchField label="Active" checked={isActive} onChange={setIsActive} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Opening Quantity" type="number" value={openingQty} onChange={setOpeningQty} placeholder="0.00" />
          </div>

          {/* Row 10: text area */}
          <div className="col-12 text-start">
            <TextArea label="Notes" value={notes} onChange={setNotes} rows={4} placeholder="Additional notes" />
          </div>

          {/* Row 11: action buttons */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate("/inventory")} submitLabel="Save Item" loading={saving} />
          </div>

          {/* error */}
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