import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import TitledGroup from "../../components/Form/TitledGroup";

/*
  RecipeNew.jsx
  - UI + logic for adding a recipe.
  - Loads VAT categories and inventory items (ingredients) for the current store.
  - Ingredients cards display: image, description (from inventory item), price (from cost per unit), and available quantity
  - On submit: sends recipe with ingredients; if set for sale, includes product fields (VAT, description)
*/

const PLACEHOLDER_IMG = "/images/placeholder.png"; // fallback if ingredient image not found

const RecipeNew = () => {
  const navigate = useNavigate();

  const [recipeName, setRecipeName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [instructions, setInstructions] = useState("");

  // ingredients source (inventory items) and selection state
  const [ingredients, setIngredients] = useState([]); // [{id,name,desc,qtyAvailable,imageUrl,price,quantity,isSelected}]
  const [selectedItems, setSelectedItems] = useState([]);

  // product sale fields
  const [isForSale, setIsForSale] = useState(false);
  const [vatId, setVatId] = useState("");
  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT", value: "" }]);
  const [saleDescription, setSaleDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(false);

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

        // VAT options
        if (mounted && vatRes && vatRes.ok) {
          const v = await vatRes.json();
          const opts = [{ label: "Select VAT", value: "" }, ...(Array.isArray(v)
            ? v.map(x => {
                const id = x.vatCategoryId ?? x.id ?? x.VatCategoryId;
                const name = x.vatCategoryName ?? x.name ?? x.VatCategoryName ?? `VAT ${id}`;
                const rate = Number(x.vatRate ?? x.rate ?? x.VatRate ?? 0);
                const label = rate > 0 ? `${name} (${rate.toFixed(3)}%)` : name;
                return { label, value: String(id) };
              })
            : [])];
          setVatOptions(opts);
        }

        // Ingredients / inventory items
        if (mounted && itemsRes && itemsRes.ok) {
          const json = await itemsRes.json();
          const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
          const mapped = (list || []).map(it => {
            const id = it.inventoryItemId ?? it.id ?? it.InventoryItemId;
            // If server didn't include image bytes metadata, use placeholder right away
              const hasInlineImageMeta = it.imageUrl != null || it.InventoryItemImage != null;
              const imgUrl = it.imageUrl ?? PLACEHOLDER_IMG;
            const desc = it.description ?? it.inventoryItemDescription ?? it.Description ?? "";
            const available = Number(it.quantity ?? it.Quantity ?? 0);
            const priceVal = Number(it.costPerUnit ?? it.CostPerUnit ?? 0);
            return {
              id,
              name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? "Item",
              desc,
              qtyAvailable: available,
              imageUrl: imgUrl || PLACEHOLDER_IMG,
              price: priceVal > 0 ? `${priceVal.toFixed(3)} BHD` : "",
              quantity: 1,
              isSelected: false,
            };
          });
          setIngredients(mapped);
          setSelectedItems(mapped.map(i => ({ ...i, isSelected: false })));
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
  }, [retry]);

  // Toggle selection for an ingredient card
  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => prev.map(p => p.id === itemId ? { ...p, isSelected: !p.isSelected } : p));
  };

  // Update quantity for selected item
  const updateItemQuantity = (itemId, qty) => {
    setSelectedItems(prev => prev.map(p => p.id === itemId ? { ...p, quantity: qty } : p));
  };

  // Build tabs for TabbedMenu (single tab "Ingredients")
  const tabs = [
    {
      label: "Ingredients",
      items: ingredients.map((it) => {
        const sel = selectedItems.find(s => String(s.id) === String(it.id));
        const isSelected = sel?.isSelected ?? false;
        const qty = sel?.quantity ?? it.quantity ?? 1;
        return {
          name: it.name,
          description: it.desc || "",
          price: it.price,
          quantity: qty,
          isSelected,
            imageUrl: it.imageUrl || "" ,
          // show available before quantity input (MenuTabCard renders quantity and we include available in description)
          extraTop: (
            <div className="small text-muted">Available: {Number(it.qtyAvailable || 0)}</div>
          ),
          onSelect: () => toggleSelectItem(it.id),
          onQuantityChange: (q) => updateItemQuantity(it.id, q)
        };
      }),
      cardComponent: (item) => (
        <MenuTabCard
          data={item}
        />
      )
    }
  ];

  const validate = () => {
    const errs = [];
    if (!String(recipeName).trim()) errs.push("Recipe name is required.");
    const chosen = selectedItems.filter(s => s.isSelected && Number(s.quantity) > 0);
    if (chosen.length === 0) errs.push("Select at least one ingredient with quantity > 0.");
    if (isForSale) {
      if (!vatId) errs.push("Select VAT category for sale.");
      if (!String(saleDescription).trim()) errs.push("Provide sale description when recipe is on sale.");
    }
    return errs;
  };

  // Build payload for submit (aligns with typical repository patterns on server)
  const buildPayload = () => {
    const ingredientsPayload = selectedItems
      .filter(s => s.isSelected && Number(s.quantity) > 0)
      .map(s => ({ inventoryItemId: Number(s.id), quantity: Number(s.quantity) }));

    const base = {
      recipeName: String(recipeName).trim(),
      instructions: instructions ? String(instructions).trim() : null,
      ingredients: ingredientsPayload,
    };

    if (isForSale) {
      return {
        ...base,
        isOnSale: true,
        vatCategoryId: vatId ? Number(vatId) : null,
        productDescription: saleDescription ? String(saleDescription).trim() : null
      };
    }
    return { ...base, isOnSale: false };
  };

  const submitJson = async (payload) => {
    return fetch("/api/recipes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const submitMultipart = async (payload) => {
    const fd = new FormData();
    fd.append("payload", new Blob([JSON.stringify(payload)], { type: "application/json" }), "payload.json");
    if (imageFile) fd.append("image", imageFile);
    return fetch("/api/recipes", { method: "POST", credentials: "include", body: fd });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = validate();
    if (errs.length) { setError(errs.join(" ")); return; }

    setSaving(true);
    const payload = buildPayload();
    try {
      const res = imageFile ? await submitMultipart(payload) : await submitJson(payload);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }
      navigate("/recipes");
    } catch (ex) {
      console.error(ex);
      setError(ex.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaBookBookmark size={35} />}
        title="Create Recipe"
        descriptionLines={[
          "Fill in the form to add a recipe:",
          "The recipe will be utilized to enter sales if it is on sale, and for managing inventory items (deducting and calculating values)"
        ]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 text-start">
            <InputField label="Recipe Name" required value={recipeName} onChange={setRecipeName} placeholder="Recipe name" />
          </div>

          <div className="col-12 text-start">
            <FileUploadField label="Recipe Image" onChange={setImageFile} accept="image/*" />
          </div>

          <div className="col-12 text-start">
            <TextArea label="Recipe Instructions" value={instructions} onChange={setInstructions} rows={6} placeholder="Step by step instructions..." />
          </div>

          <div className="col-12">
            <label className="form-label">Recipe Items</label>
            <TabbedMenu tabs={tabs} />
          </div>

          <div className="col-12 mt-4">
            <TitledGroup title="Product Details" subtitle="Configure sale options for this recipe">
              <div className="row gx-3 gy-3">
                <div className="col-12 col-md-6 d-flex align-items-center text-start">
                  <SwitchField label="Set recipe for sale?" checked={isForSale} onChange={setIsForSale} />
                </div>
                <div className="col-12 col-md-6 text-start">
                  <SelectField label="VAT Category" value={vatId} onChange={setVatId} options={vatOptions} searchable={false} />
                </div>
                <div className="col-12 text-start">
                  <TextArea label="Recipe Description (Sale)" value={saleDescription} onChange={setSaleDescription} rows={3} placeholder="Description shown when recipe is on sale" />
                </div>
              </div>
            </TitledGroup>
          </div>

          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/recipes")}
              submitLabel={saving ? "Saving..." : "Save Recipe"}
              loading={saving}
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