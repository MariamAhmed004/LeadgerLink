import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { FaBookBookmark } from "react-icons/fa6";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import FileUploadField from "../../components/Form/FileUploadField";
import TextArea from "../../components/Form/TextArea";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import TabbedMenu from "../../components/Form/TabbedMenu";
import MenuTabCard from "../../components/Form/MenuTabCard";
import FormActions from "../../components/Form/FormActions";

/*
  RecipeNew.jsx
  - UI for adding a recipe. Submit handling intentionally not implemented.
  - Rows:
    1) Recipe Name
    2) Recipe Image (file upload)
    3) Recipe Instructions (textarea)
    4) Recipe Items (tabbed menu)
    5) Set recipe for sale? (switch) + VAT (dropdown)
    6) Recipe Description (for sale)
    7) Action buttons (Cancel / Save) -- Save is a stub and only logs values
*/

const RecipeNew = () => {
  const navigate = useNavigate();

  const [recipeName, setRecipeName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState([]); // available items for selection
  const [selectedItems, setSelectedItems] = useState([]); // { id, name, qty, isSelected }

  const [isForSale, setIsForSale] = useState(false);
  const [vatId, setVatId] = useState("");
  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT", value: "" }]);
  const [saleDescription, setSaleDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load lookups: VAT categories and inventory items (ingredients)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [vatRes, itemsRes] = await Promise.all([
          fetch("/api/vatcategories", { credentials: "include" }).catch(() => null),
          fetch("/api/inventoryitems/list-for-current-store?page=1&pageSize=1000", { credentials: "include" }).catch(() => null),
        ]);

        if (mounted) {
          // VAT options
          if (vatRes && vatRes.ok) {
            const v = await vatRes.json();
            const opts = [{ label: "Select VAT", value: "" }, ...(Array.isArray(v) ? v.map(x => ({ label: x.vatCategoryName ?? x.label ?? String(x), value: String(x.vatCategoryId ?? x.id ?? "") })) : [])];
            setVatOptions(opts);
          }

          // Ingredients / inventory items for TabbedMenu
          if (itemsRes && itemsRes.ok) {
            const json = await itemsRes.json();
            const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
            const mapped = (list || []).map(it => ({
              id: it.inventoryItemId ?? it.id,
              name: it.inventoryItemName ?? it.inventoryItemName ?? it.name ?? "Item",
              qtyAvailable: it.quantity ?? it.Quantity ?? 0,
              isSelected: false,
              quantity: 1
            }));
            setIngredients(mapped);
            setSelectedItems(mapped.map(i => ({ ...i, isSelected: false })));
          }
        }
      } catch (ex) {
        console.error("Failed to load lookups for recipe form", ex);
        if (mounted) setError("Failed to load lookups");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Toggle selection for an ingredient card
  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const found = prev.find(p => String(p.id) === String(itemId));
      if (!found) return prev;
      return prev.map(p => p.id === itemId ? { ...p, isSelected: !p.isSelected } : p);
    });
  };

  // Update quantity for selected item
  const updateItemQuantity = (itemId, qty) => {
    setSelectedItems(prev => prev.map(p => p.id === itemId ? { ...p, quantity: qty } : p));
  };

  // Build tabs for TabbedMenu (single tab "Ingredients")
  const tabs = [
    {
      label: "Ingredients",
      items: ingredients.map((it) => ({
        name: it.name,
        description: `Available: ${it.qtyAvailable}`,
        price: "", // not applicable for ingredients
        quantity: it.quantity ?? 1,
        isSelected: selectedItems.find(s => String(s.id) === String(it.id))?.isSelected ?? false,
        onSelect: () => toggleSelectItem(it.id),
        onQuantityChange: (q) => updateItemQuantity(it.id, q)
      })),
      cardComponent: (item) => (
        <MenuTabCard
          data={item}
        />
      )
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit intentionally not implemented per instructions.
    const chosen = selectedItems.filter(s => s.isSelected).map(s => ({ id: s.id, name: s.name, quantity: s.quantity }));
    console.log("Recipe save not implemented. Values:", {
      recipeName, imageFile, instructions, chosen, isForSale, vatId, saleDescription
    });
  };

  return (
    <div className="container py-5">
      <PageHeader
              icon={<FaBookBookmark size={35} />}
        title="Create Recipe"
        descriptionLines={[
            "Fill in the form to add a recipe:", "The recipe will be utilized to enter sales if it is on sale, and for managing inventory items (deducting and calculating values)"
              ]}
              actions={[]}
     
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: Recipe Name */}
          <div className="col-12 text-start">
            <InputField label="Recipe Name" required value={recipeName} onChange={setRecipeName} placeholder="Recipe name" />
          </div>

          {/* Row 2: Recipe Image */}
          <div className="col-12 text-start">
            <FileUploadField label="Recipe Image" onChange={setImageFile} accept="image/*" />
          </div>

          {/* Row 3: Instructions */}
          <div className="col-12 text-start">
            <TextArea label="Recipe Instructions" value={instructions} onChange={setInstructions} rows={6} placeholder="Step by step instructions..." />
          </div>

          {/* Row 4: Recipe Items (TabbedMenu) */}
          <div className="col-12">
            <label className="form-label">Recipe Items</label>
            <TabbedMenu tabs={tabs} />
          </div>

          {/* Row 5: On sale switch + VAT select */}
          <div className="col-12 col-md-6 text-start d-flex align-items-center">
            <SwitchField label="Set recipe for sale?" checked={isForSale} onChange={setIsForSale} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField label="VAT Category" value={vatId} onChange={setVatId} options={vatOptions} searchable={false} />
          </div>

          {/* Row 6: Recipe Description (for sale) */}
          <div className="col-12 text-start">
            <TextArea label="Recipe Description (Sale)" value={saleDescription} onChange={setSaleDescription} rows={3} placeholder="Description shown when recipe is on sale" />
          </div>

          {/* Row 7: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/recipes")}
              submitLabel="Save Recipe"
              loading={false}
            />
          </div>

          {loading && (
            <div className="col-12">
              <div className="text-muted">Loading lookups…</div>
            </div>
          )}

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

export default RecipeNew;