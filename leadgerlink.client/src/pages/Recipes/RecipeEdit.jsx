import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import InfoModal from "../../components/Ui/InfoModal";


/*
  RecipeEdit.jsx
  Summary:
  - Edit an existing recipe. Loads recipe + ingredients and VAT lookups,
    allows updating ingredients, pricing and sale-related info, then saves
    changes to the server (multipart when an image is attached).
*/

const PLACEHOLDER_IMG = "/images/placeholder.png";

// --------------------------------------------------
// COMPONENT / STATE
// --------------------------------------------------
const RecipeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
    const { loggedInUser } = useAuth();
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

  // UI flags
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Core recipe fields
  const [recipeName, setRecipeName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [instructions, setInstructions] = useState("");

  // Ingredients and selection state
  const [ingredients, setIngredients] = useState([]); // inventory items available
  const [selectedItems, setSelectedItems] = useState([]); // {id, quantity, isSelected}
  const [recipeCost, setRecipeCost] = useState(0);

  // Sale / product fields
  const [isForSale, setIsForSale] = useState(false);
  const [vatId, setVatId] = useState("");
  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT", value: "" }]);
  const [vatList, setVatList] = useState([]);
  const [saleDescription, setSaleDescription] = useState("");
  const [relatedProductId, setRelatedProductId] = useState(null);
  const [originalOnSale, setOriginalOnSale] = useState(false);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [sellingPriceTouched, setSellingPriceTouched] = useState(false);

  // Capture storeId from fetched recipe details (used when user is Organization Admin)
  const [fetchedStoreId, setFetchedStoreId] = useState(null);

  // --------------------------------------------------
  // EFFECT: load recipe, ingredients and VAT lookups
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!id) throw new Error("Missing recipe id");

        // Fetch recipe first so we can capture storeId from recipe details.
        const rRes = await fetch(`/api/recipes/${encodeURIComponent(id)}/with-ingredients`, { credentials: "include" });
        if (!rRes.ok) {
          const txt = await rRes.text().catch(() => null);
          throw new Error(txt || `Failed to load recipe`);
        }
        const rJson = await rRes.json();
        if (!mounted) return;

        // populate fields from recipe DTO
        setRecipeName(rJson.recipeName ?? "");
        setInstructions(rJson.description ?? "");
        setIsForSale(!!rJson.isOnSale);
        setRelatedProductId(rJson.relatedProductId ?? null);
        setOriginalOnSale(!!rJson.isOnSale || !!rJson.relatedProductId);
        setSaleDescription(rJson.productDescription ?? "");
        setPreviewImage(rJson.image ?? "");
        setFetchedStoreId(rJson.storeId ?? null);

        // Decide inventory items URL: include storeId query only when loggedInUser is Organization Admin
        const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
        let inventoryUrl = `/api/inventoryitems/list-for-current-store?page=1&pageSize=1000`;
        if (isOrgAdmin && rJson.storeId) {
          inventoryUrl += `&storeId=${encodeURIComponent(rJson.storeId)}`;
        }

        // Fetch VAT categories and inventory items in parallel now that we have recipe/store info
        const [vatRes, itemsRes] = await Promise.all([
          fetch("/api/products/vatcategories", { credentials: "include" }).catch(() => null),
          fetch(inventoryUrl, { credentials: "include" }).catch(() => null)
        ]);

        // map ingredients available for selection from itemsRes
        if (itemsRes && itemsRes.ok) {
          const itemsJson = await itemsRes.json();
          const list = Array.isArray(itemsJson.items) ? itemsJson.items : (Array.isArray(itemsJson) ? itemsJson : []);
          const mapped = (list || []).map(it => {
            const iid = it.inventoryItemId ?? it.id ?? 0;
            const img = it.imageUrl ?? PLACEHOLDER_IMG;
            return {
              id: iid,
              name: it.inventoryItemName ?? it.name ?? `Item ${iid}`,
              desc: it.description ?? "",
              qtyAvailable: Number(it.quantity ?? 0),
              costPerUnit: Number(it.costPerUnit ?? it.CostPerUnit ?? 0),
              imageUrl: img || PLACEHOLDER_IMG
            };
          });
          setIngredients(mapped);

          // prepare selectedItems from recipe ingredients
          const sel = (rJson.ingredients || []).map(ing => ({ id: Number(ing.inventoryItemId), isSelected: true, quantity: Number(ing.quantity) }));

          // ensure we have entries for items that were in selection but not in mapped list
          sel.forEach(s => {
            if (!mapped.find(m => m.id === s.id)) {
              mapped.push({ id: s.id, name: `Item ${s.id}`, desc: '', qtyAvailable: 0, imageUrl: PLACEHOLDER_IMG });
            }
          });

          setSelectedItems(sel);

          // compute initial cost based on selection
          const initialCost = sel.reduce((acc, s) => {
            const inv = mapped.find(m => m.id === s.id);
            const unit = inv ? Number(inv.costPerUnit || 0) : 0;
            const qty = Number(s.quantity || 0);
            return acc + (unit * qty);
          }, 0);
          setRecipeCost(initialCost);
        }

        // vat categories
        if (vatRes && vatRes.ok) {
          const vJson = await vatRes.json();
          setVatList(Array.isArray(vJson) ? vJson : []);
          const opts = [{ label: 'Select VAT', value: '' }, ...(Array.isArray(vJson) ? vJson.map(v => ({ label: v.vatCategoryName + (v.vatRate ? ` (${Number(v.vatRate).toFixed(3)}%)` : ''), value: String(v.vatCategoryId) })) : [])];
          setVatOptions(opts);
          // if recipe has related product, fetch product to get its vat id and description
          if (rJson.relatedProductId) {
            try {
              const pRes = await fetch(`/api/products/${encodeURIComponent(rJson.relatedProductId)}`, { credentials: 'include' });
              if (pRes.ok) {
                const pJson = await pRes.json();
                if (!mounted) return;
                setVatId(pJson.vatCategoryId ? String(pJson.vatCategoryId) : "");
                setSaleDescription(pJson.description ?? "");
                setSellingPrice(pJson.sellingPrice != null ? Number(pJson.sellingPrice) : 0);
                setSellingPriceTouched(false);
              }
            } catch { /* empty */ }
          }
        }
      } catch (ex) {
        console.error(ex);
        if (mounted) setError(ex?.message || 'Failed to load recipe');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, loggedInUser]);

  // --------------------------------------------------
  // TABS: build tabs for TabbedMenu from ingredients
  // --------------------------------------------------
  const tabs = [
    {
      label: 'Ingredients',
      items: ingredients.map(it => ({
        name: it.name,
        description: it.desc,
        price: '',
        quantity: Number(it.qtyAvailable || 0),
        // initialize selection quantity for TabbedMenu so it pre-selects items saved on the recipe
        initialSelectedQty: (selectedItems.find(s => Number(s.id) === Number(it.id)) || {}).quantity || 0,
        isSelected: !!(selectedItems.find(s => s.id === it.id && s.isSelected)),
        imageUrl: it.imageUrl || PLACEHOLDER_IMG
      })),
      cardComponent: (item) => <MenuTabCard data={{ ...item, enforceAvailability: false }} />
    }
  ];

  // --------------------------------------------------
  // SELECTION: handle selection change from TabbedMenu
  // --------------------------------------------------
  const handleSelectionChange = (sel) => {
    const next = (sel || []).map(s => {
      const idFrom = Number(s.productId || s.id || 0);
      let idVal = idFrom;
      if (!idVal && s.tabLabel === 'Ingredients' && typeof s.index === 'number') {
        idVal = Number(ingredients[s.index]?.id || 0);
      }
      const qty = Number(s.quantity || 0);
      return idVal > 0 ? { id: idVal, isSelected: qty > 0, quantity: qty } : null;
    }).filter(Boolean);
    setSelectedItems(next);
  };

  // --------------------------------------------------
  // VALIDATION / PAYLOAD
  // --------------------------------------------------
  const validate = () => {
    const errs = [];
    if (!String(recipeName).trim()) errs.push('Recipe name is required.');
    if ((selectedItems || []).filter(s => s.isSelected && Number(s.quantity) > 0).length === 0) errs.push('Select at least one ingredient with quantity > 0.');
    if (!isForSale) return errs;
    if (isForSale) {
      if (!vatId) errs.push('Select VAT category for sale.');
    }
    return errs;
  };

  const buildPayload = () => {
    const ingredientsPayload = (selectedItems || []).filter(s => s.isSelected && Number(s.quantity) > 0).map(s => ({ inventoryItemId: Number(s.id), quantity: Number(s.quantity) }));
    const base = { recipeId: Number(id), recipeName: String(recipeName).trim(), instructions: instructions ? String(instructions).trim() : null, ingredients: ingredientsPayload };
    if (isForSale) {
      const payload = { ...base, isOnSale: true, vatCategoryId: vatId ? Number(vatId) : null, productDescription: saleDescription ? String(saleDescription).trim() : null };
      if (recipeCost != null) payload.costPrice = Number(Number(recipeCost).toFixed(3));
      if (sellingPrice || sellingPrice === 0) payload.sellingPrice = Number(Number(sellingPrice).toFixed(3));
      return payload;
    }
    return { ...base, isOnSale: false };
  };

  // --------------------------------------------------
  // SUBMIT HELPERS
  // --------------------------------------------------
  const submitMultipart = async (payload) => {
    const fd = new FormData();
    fd.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'payload.json');
    if (imageFile) fd.append('image', imageFile);

    // Append fetched storeId query only when logged-in user is Organization Admin
    let url = `/api/recipes/${encodeURIComponent(id)}`;
    const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
    if (isOrgAdmin && fetchedStoreId) url += `?storeId=${encodeURIComponent(fetchedStoreId)}`;

    return fetch(url, { method: 'PUT', credentials: 'include', body: fd });
  };

  const submitJson = async (payload) => {
    // Append fetched storeId query only when logged-in user is Organization Admin
    let url = `/api/recipes/${encodeURIComponent(id)}`;
    const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
    if (isOrgAdmin && fetchedStoreId) url += `?storeId=${encodeURIComponent(fetchedStoreId)}`;

    return fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  // --------------------------------------------------
  // SUBMIT: validate and PUT
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (errs.length) { setError(errs.join(' ')); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = imageFile ? await submitMultipart(payload) : await submitJson(payload);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }
      navigate('/recipes');
    } catch (ex) {
      console.error(ex);
      setError(ex?.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DERIVED: recompute cost when selection changes
  // --------------------------------------------------
  useEffect(() => {
    const total = (selectedItems || []).reduce((acc, s) => {
      if (!s || !s.isSelected) return acc;
      const inv = ingredients.find(i => Number(i.id) === Number(s.id));
      const unit = inv ? Number(inv.costPerUnit || 0) : 0;
      const qty = Number(s.quantity || 0);
      return acc + (unit * qty);
    }, 0);
    setRecipeCost(total);
  }, [selectedItems, ingredients]);

  // --------------------------------------------------
  // DERIVED: initialize selling price when cost/vat change
  // --------------------------------------------------
  useEffect(() => {
    if (sellingPriceTouched) return;
    const v = (vatList || []).find(x => String(x.vatCategoryId) === String(vatId));
    const rate = v ? Number(v.vatRate || 0) : 0;
    const sp = Number((recipeCost * (1 + rate / 100)).toFixed(3));
    setSellingPrice(sp);
  }, [recipeCost, vatId, vatList, sellingPriceTouched]);

  // --------------------------------------------------
  // SELLING PRICE HANDLERS & WARNINGS
  // --------------------------------------------------
  const onSellingPriceChange = (v) => {
    const num = Number(String(v).replace(/[^0-9.-]/g, "")) || 0;
    setSellingPrice(num);
    setSellingPriceTouched(true);
  };

  // toggle handler that supports event or boolean
  const onSaleToggle = (val) => {
    const v = typeof val === 'boolean' ? val : (val && val.target ? Boolean(val.target.checked) : false);
    setIsForSale(v);
  };

  // debounced warning state to avoid flashing when prices update rapidly
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const shouldWarn = Number(sellingPrice || 0) < Number(recipeCost || 0) && Number(sellingPrice || 0) > 0;
    // debounce to prevent flash when cost/selling update in quick succession
    const t = setTimeout(() => {
      if (!mounted) return;
      setShowWarning(shouldWarn);
    }, 250);

    return () => { mounted = false; clearTimeout(t); };
  }, [sellingPrice, recipeCost]);


    // --------------------------------------------------
    // REMOVE ITEM FROM SALE
    // --------------------------------------------------
    const handleRemoveFromSale = async () => {
        try {
            if (!relatedProductId) {
                throw new Error("No product is associated with this recipe.");
            }

            // Call the DELETE endpoint for the product
            const response = await fetch(`/api/products/${relatedProductId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Failed to remove recipe from sale.");
                throw new Error(errorText);
            }

            // Show success message
            setSuccessMessage("The recipe was successfully removed from sale.");

            // Reset the product-related state
            setOriginalOnSale(false);
            setRelatedProductId(null);
        } catch (error) {
            console.error("Error removing recipe from sale:", error);
            alert(error.message || "Failed to remove recipe from sale.");
        } finally {
            setShowRemoveModal(false); // Close the modal
        }
    };

    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaBookBookmark size={35} />}
        title={`Edit Recipe${id ? ` ${id}` : ''}`}
        descriptionLines={["Edit recipe details and ingredients.", "If marked for sale, product details will be created/updated."]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 text-start">
            <InputField label="Recipe Name" required value={recipeName} onChange={setRecipeName} placeholder="Recipe name" />
          </div>

          <div className="col-12 text-start">
            <FileUploadField label="Recipe Image" onChange={setImageFile} accept="image/*" />
            {previewImage && <div className="mt-2"><img src={previewImage} alt="preview" style={{maxWidth: 200}}/></div>}
          </div>

          <div className="col-12 text-start">
            <TextArea label="Recipe Instructions" value={instructions} onChange={setInstructions} rows={6} placeholder="Step by step instructions..." />
          </div>

          <div className="col-12 text-start">
            <label className="form-label">Ingredients</label>
            <TabbedMenu tabs={tabs} onSelectionChange={handleSelectionChange} />
          </div>

          <div className="col-12 mt-4">
            <TitledGroup title="Product Details" subtitle={originalOnSale ? "Manage sale-related actions" : "Configure sale options for this recipe"}>
                          {successMessage && (
                              <div className="alert alert-success mb-3">
                                  {successMessage}
                              </div>
                          )}

                          {originalOnSale ? (
                <div className="row gx-3 gy-3">
                  <div className="col-12">
                    <div className="alert alert-light mb-3 text-start">
                      <strong>Use "Edit Product"</strong> to update sale-related settings (price, VAT, etc.) for the product linked to this recipe.
                      <br />
                      <strong>"Remove Recipe from Sale"</strong> will stop selling this recipe as a product; the product record will not be deleted automatically.
                    </div>
                  </div>
                  <div className="align-items-center col-12">
                    <div className="d-flex gap-2">
                      <a className="btn btn-dark btn-sm" href={relatedProductId ? `/products/edit/${relatedProductId}` : '/products'}>Edit Product</a>
                                          <button className="btn btn-dark btn-sm" type="button" onClick={() => setShowRemoveModal(true)}>Remove Recipe from Sale</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="row gx-3 gy-3">
                  <div className="col-12 col-md-6 d-flex align-items-center text-start">
                    <SwitchField label="Set recipe for sale?" checked={isForSale} onChange={onSaleToggle} />
                  </div>
                  <div className="col-12 col-md-6 text-start">
                    <SelectField label="VAT Category" value={vatId} onChange={setVatId} options={vatOptions} searchable={false} />
                  </div>
                  <div className="col-12 col-md-6 text-start">
                    <InputField label="Selling Price (BHD)" value={sellingPrice ? Number(sellingPrice).toFixed(3) : "0.000"} onChange={onSellingPriceChange} placeholder="XX.XXX BHD" inputProps={{ inputMode: 'decimal' }} />
                  </div>
                  <div className="col-12 col-md-6 text-start">
                    <InputField label="Cost Price (BHD)" value={recipeCost != null ? Number(recipeCost).toFixed(3) : ""} readOnly disabled placeholder="XX.XXX BHD" inputProps={{ inputMode: 'decimal' }} />
                  </div>
                  <div className="col-12 text-start">
                    <TextArea label="Recipe Description (Sale)" value={saleDescription} onChange={setSaleDescription} rows={3} placeholder="Description shown when recipe is on sale" />
                  </div>
                  {showWarning && (
                    <div className="col-12">
                      <div className="alert alert-warning">Selling price is lower than the computed cost price.</div>
                    </div>
                  )}
                  <div className="col-12">
                    <div className="alert alert-secondary text-start">
                      To put the recipe on sale, enable "Set recipe for sale?", then select VAT category and provide a selling price. These values are saved when you click Save Recipe.
                    </div>
                  </div>
                </div>
              )}
            </TitledGroup>
                  </div>

                  {/* Confirmation Modal */}
                  <InfoModal
                      show={showRemoveModal}
                      title="Confirm Remove from Sale"
                      onClose={() => setShowRemoveModal(false)}
                  >
                      <p>
                          This action will remove the recipe from products and delete it from all previous sales details.
                          <strong> This action cannot be undone.</strong> Are you sure you want to proceed?
                      </p>
                      <div className="d-flex justify-content-end gap-2">
                          <button className="btn btn-secondary" onClick={() => setShowRemoveModal(false)}>
                              Cancel
                          </button>
                          <button className="btn btn-danger" onClick={handleRemoveFromSale}>
                              Remove from Sale
                          </button>
                      </div>
                  </InfoModal>

          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate('/recipes')} submitLabel={saving ? 'Saving...' : 'Save Recipe'} loading={saving} />
          </div>

          {loading && (
            <div className="col-12"><div className="text-muted">Loading…</div></div>
          )}

          {error && (
            <div className="col-12"><div className="alert alert-danger mb-0">{error}</div></div>
          )}
        </div>
      </FormBody>
    </div>
  );
};

export default RecipeEdit;
