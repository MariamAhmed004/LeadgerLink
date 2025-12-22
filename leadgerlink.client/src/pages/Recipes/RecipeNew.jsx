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
import { useAuth } from "../../Context/AuthContext";

/*
  RecipeNew.jsx
  Summary:
  - Form page for creating a new recipe. Loads VAT categories and inventory items
    (ingredients), allows selecting ingredients and optional product settings,
    then submits the recipe (JSON or multipart if an image is attached).
*/

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------
const PLACEHOLDER_IMG = "/images/placeholder.png"; // fallback if ingredient image not found

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
const RecipeNew = () => {
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();
  // role flags
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin");
  const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;

  // --------------------------------------------------
  // STATE: store selection (org admin)
  // --------------------------------------------------
  // selected store for organization admins
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);

  // --------------------------------------------------
  // STATE: recipe core fields
  // --------------------------------------------------
  // recipe metadata
  const [recipeName, setRecipeName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [instructions, setInstructions] = useState("");

  // --------------------------------------------------
  // STATE: ingredients & selection
  // --------------------------------------------------
  // ingredients source (inventory items) and selection state
  const [ingredients, setIngredients] = useState([]); // [{id,name,desc,qtyAvailable,imageUrl,costPerUnit,quantity,isSelected}]
  const [selectedItems, setSelectedItems] = useState([]);

  // --------------------------------------------------
  // STATE: product sale fields
  // --------------------------------------------------
  const [isForSale, setIsForSale] = useState(false);
  const [vatId, setVatId] = useState("");
  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT", value: "" }]);
  // full VAT objects (used for rates)
  const [vatList, setVatList] = useState([]);
  const [saleDescription, setSaleDescription] = useState("");

  // --------------------------------------------------
  // STATE: pricing and UI flags
  // --------------------------------------------------
  // computed cost based on selected ingredients
  const [costPrice, setCostPrice] = useState(0);
  // selling price editable by user
  const [sellingPrice, setSellingPrice] = useState(0);
  const [sellingPriceTouched, setSellingPriceTouched] = useState(false);

  // loading / saving / error
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(false);

  // --------------------------------------------------
  // EFFECT: load lookups (VAT categories and inventory items)
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [vatRes, itemsRes] = await Promise.all([
          fetch("/api/products/vatcategories", { credentials: "include" }).catch(() => null),
          fetch(
            `/api/inventoryitems/list-for-current-store?page=1&pageSize=1000${isOrgAdmin && storeId ? `&storeId=${storeId}` : ""}`,
            { credentials: "include" }
          ).catch(() => null),
        ]);

        // VAT options (keep full list for computing rates)
        if (mounted && vatRes && vatRes.ok) {
          const v = await vatRes.json();
          setVatList(Array.isArray(v) ? v : []);
          const opts = [{ label: "Select VAT", value: "" }, ...(Array.isArray(v)
            ? v.map(x => {
                const id = x.vatCategoryId;
                const name = x.vatCategoryName;
                const rate = Number(x.vatRate ?? 0);
                const label = rate > 0 ? `${name} (${rate.toFixed(3)}%)` : name;
                return { label, value: String(id) };
              })
            : [])];
          setVatOptions(opts);
        }

        // Ingredients / inventory items mapping for ingredient cards
        if (mounted && itemsRes && itemsRes.ok) {
          const json = await itemsRes.json();
          const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
          const mapped = (list || []).map(it => {
            const id = it.inventoryItemId ?? it.id ?? it.InventoryItemId;
            const imgUrl = it.imageUrl ?? PLACEHOLDER_IMG;
            const desc = it.description ?? it.inventoryItemDescription ?? it.Description ?? "";
            const available = Number(it.quantity ?? it.Quantity ?? 0);
            const costVal = Number(it.costPerUnit ?? it.CostPerUnit ?? 0);
            return {
              id,
              name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? "Item",
              desc,
              qtyAvailable: available,
              imageUrl: imgUrl || PLACEHOLDER_IMG,
              costPerUnit: costVal,
              price: costVal > 0 ? `${costVal.toFixed(3)} BHD` : "",
              quantity: available,
              isSelected: false,
            };
          });
          setIngredients(mapped);
          // initialize selectedItems entries with zeros
          setSelectedItems(mapped.map(i => ({ id: i.id, isSelected: false, quantity: 0 })));
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
  }, [retry, storeId, isOrgAdmin]);

  // --------------------------------------------------
  // EFFECT: compute costPrice and default sellingPrice
  // --------------------------------------------------
  useEffect(() => {
    const computeCost = () => {
      let total = 0;
      (selectedItems || []).forEach(si => {
        const qty = Number(si.quantity || 0);
        if (!si.isSelected || qty <= 0) return;
        const ing = ingredients.find(i => Number(i.id) === Number(si.id));
        if (!ing) return;
        const cpu = Number(ing.costPerUnit || 0);
        total += cpu * qty;
      });
      return total;
    };

    const newCost = computeCost();
    // update derived cost price
    setCostPrice(newCost);

    // if selling price not touched by user, initialize to include VAT
    if (!sellingPriceTouched) {
      const vatObj = vatList.find(v => String(v.vatCategoryId) === String(vatId));
      const rate = vatObj ? Number(vatObj.vatRate ?? 0) : 0;
      const sp = newCost * (1 + rate / 100);
      setSellingPrice(Number(sp.toFixed(3)));
    }
  }, [selectedItems, ingredients, vatId, vatList, sellingPriceTouched]);

  // --------------------------------------------------
  // SELECTION HELPERS
  // --------------------------------------------------
  // Toggle selection for an ingredient card (checked state)
  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => prev.map(p => p.id === itemId ? { ...p, isSelected: !p.isSelected } : p));
  };

  // Update quantity for a selected item and mark isSelected when qty > 0
  const updateItemQuantity = (id, quantity) => {
    setSelectedItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, quantity, isSelected: quantity > 0 } : x
      )
    );
  };

  // --------------------------------------------------
  // TABS CONFIG: ingredients tab for TabbedMenu
  // --------------------------------------------------
  const tabs = [
    {
      label: "Ingredients",
      items: ingredients.map((it, idx) => ({
        // display fields used by MenuTabCard
        name: it.name,
        description: it.desc || "",
        price: it.price,
        // available quantity displayed by the card
        quantity: Number(it.qtyAvailable || 0),
        isSelected: (selectedItems.find(s => Number(s.id) === Number(it.id))?.isSelected) || false,
        imageUrl: it.imageUrl || "",
        extraTop: (<div className="small text-muted">Available: {Number(it.qtyAvailable || 0)}</div>),
        // include index so TabbedMenu can map back when selection events are emitted
        inventoryId: it.id,
      })),
      cardComponent: (item) => (
        <MenuTabCard
          data={{ ...item, enforceAvailability: false }}
        />
      )
    }
  ];

  // --------------------------------------------------
  // SELECTION SYNC: normalize TabbedMenu selection to selectedItems
  // --------------------------------------------------
  // TabbedMenu emits entries like: [{ tabLabel, index, productId, name, price, quantity }]
  const handleSelectionChange = (sel) => {
    const next = (sel || [])
      .map(s => {
        // Try using productId first; fall back to ingredients by index
        const idFromPayload = Number(s.productId || s.id || 0);
        let id = idFromPayload;
        if (!id && s.tabLabel === "Ingredients" && typeof s.index === "number") {
          const source = ingredients[s.index];
          id = Number(source?.id || 0);
        }
        const qty = Number(s.quantity || 0);
        return id > 0 ? { id, isSelected: qty > 0, quantity: qty } : null;
      })
      .filter(Boolean);
    setSelectedItems(next);
  };

  // --------------------------------------------------
  // VALIDATION / PAYLOAD BUILDING
  // --------------------------------------------------
  const validate = () => {
    const errs = [];
    if (!String(recipeName).trim()) errs.push("Recipe name is required.");
    if ((selectedItems || []).filter(s => s.isSelected && Number(s.quantity) > 0).length === 0) {
      errs.push("Select at least one ingredient with quantity > 0.");
    }
    if (isForSale) {
      if (!vatId) errs.push("Select VAT category for sale.");
      // Removed the validation for saleDescription
    }
    return errs;
  };

  // Build payload expected by the API from selectedItems and form fields
  const buildPayload = () => {
    const ingredientsPayload = (selectedItems || [])
      .filter(s => s.isSelected && Number(s.quantity) > 0)
      .map(s => ({ inventoryItemId: Number(s.id), quantity: Number(s.quantity) }));

    const base = {
      recipeName: String(recipeName).trim(),
      instructions: instructions ? String(instructions).trim() : null,
      ingredients: ingredientsPayload,
    };

    if (isOrgAdmin) {
      base.storeId = storeId ? Number(storeId) : null; // Include storeId if org admin
    }

    if (isForSale) {
      return {
        ...base,
        isOnSale: true,
        vatCategoryId: vatId ? Number(vatId) : null,
        productDescription: saleDescription ? String(saleDescription).trim() : null, // Optional field
        costPrice: Number(costPrice.toFixed(3)),
        sellingPrice: Number(sellingPrice || 0),
      };
    }

    return { ...base, isOnSale: false };
  };

  // --------------------------------------------------
  // SUBMIT HELPERS: JSON vs multipart
  // --------------------------------------------------
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

  // --------------------------------------------------
  // SUBMIT: validate then post
  // --------------------------------------------------
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

  // --------------------------------------------------
  // SELLING PRICE: user edits and warning logic
  // --------------------------------------------------
  const onSellingPriceChange = (v) => {
    const num = Number(String(v).replace(/[^0-9.-]/g, "")) || 0;
    setSellingPrice(num);
    setSellingPriceTouched(true);
  };

  // debounce warning when selling < cost
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const shouldWarn = Number(sellingPrice || 0) < Number(costPrice || 0) && Number(sellingPrice || 0) > 0;
    const t = setTimeout(() => {
      if (!mounted) return;
      setShowWarning(shouldWarn);
    }, 250);

    return () => { mounted = false; clearTimeout(t); };
  }, [sellingPrice, costPrice]);

  // --------------------------------------------------
  // EFFECT: load stores for org admin
  // --------------------------------------------------
  useEffect(() => {
    if (!isOrgAdmin || !orgId) return;
    const loadStores = async () => {
      try {
        const res = await fetch(`/api/stores/by-organization/${orgId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setStores(data || []);
        } else {
          setStores([]);
        }
      } catch {
        setStores([]);
      }
    };
    loadStores();
  }, [isOrgAdmin, orgId]);

  // Helper for store select options
  const storeOptions = (stores || []).map(s => ({
    label: s.storeName ?? s.name ?? `Store ${s.id}`,
    value: String(s.storeId ?? s.id)
  }));

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
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
          {isOrgAdmin && (
            <div className="col-12 text-start">
              <SelectField
                label="Store"
                value={storeId}
                onChange={setStoreId}
                options={[{ label: "Select store", value: "" }, ...storeOptions]}
                required
              />
            </div>
          )}

          <div className="col-12 text-start">
            <InputField label="Recipe Name" required value={recipeName} onChange={setRecipeName} placeholder="Recipe name" />
          </div>

          <div className="col-12 text-start">
            <FileUploadField label="Recipe Image" onChange={setImageFile} accept="image/*" />
          </div>

          <div className="col-12 text-start">
            <TextArea label="Recipe Instructions" value={instructions} onChange={setInstructions} rows={6} placeholder="Step by step instructions..." />
          </div>

          <div className="col-12 text-start">
            <label className="form-label">Add recipe ingredients by selecting items from your inventory.</label>
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border text-primary me-2" role="status" aria-label="Loading ingredients"></div>
                <span>Loading ingredients...</span>
              </div>
            ) : (
              <TabbedMenu
                tabs={tabs}
                onSelectionChange={handleSelectionChange}
              />
            )}
          </div>

          <div className="col-12 mt-4">
            <TitledGroup title="Product Details" subtitle="Configure sale options for this recipe">
              <div className="row gx-3 gy-3">
                <div className="col-12 col-md-6 d-flex align-items-center text-start">
                  <SwitchField label="Set recipe for sale?" checked={isForSale} onChange={setIsForSale} />
                </div>
                <div className="col-12 col-md-6 text-start">
                  <SelectField
                    label="VAT Category"
                    value={vatId}
                    onChange={setVatId}
                    options={vatOptions}
                    searchable={false}
                  />
                </div>

                <div className="col-12 col-md-6 text-start">
                  <InputField label="Selling Price (BHD)" value={sellingPrice ? Number(sellingPrice).toFixed(3) : "0.000"} onChange={onSellingPriceChange} />
                </div>

                <div className="col-12 col-md-6 text-start">
                  <InputField label="Cost Price (BHD)" value={costPrice ? costPrice.toFixed(3) : "0.000"} onChange={() => {}} disabled />
                </div>

                <div className="col-12 text-start">
                  <TextArea label="Recipe Description (Sale)" value={saleDescription} onChange={setSaleDescription} rows={3} placeholder="Description shown when recipe is on sale" />
                </div>

                {showWarning && (
                  <div className="col-12">
                    <div className="alert alert-warning">Selling price is lower than the computed cost price.</div>
                  </div>
                )}

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