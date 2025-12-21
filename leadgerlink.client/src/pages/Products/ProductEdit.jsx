import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BiSolidPackage } from "react-icons/bi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import FormActions from "../../components/Form/FormActions";
import TextArea from "../../components/Form/TextArea";
import { useAuth } from "../../Context/AuthContext";

/*
  ProductEdit.jsx
  Summary:
  - Edit form for a product. Loads product DTO and VAT categories, allows updating
    name, VAT, price and description, then saves changes to the server.
*/

// --------------------------------------------------
// COMPONENT / STATE
// --------------------------------------------------
const ProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // --------------------------------------------------
  // UI flags
  // --------------------------------------------------
  // Loading state while fetching product
  const [loading, setLoading] = useState(true);
  // Saving state while persisting changes
  const [saving, setSaving] = useState(false);
  // Error message for user feedback
  const [error, setError] = useState("");
  // Show warning when selling price below cost
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  // --------------------------------------------------
  // FORM FIELDS
  // --------------------------------------------------
  // Editable product fields
  const [productName, setProductName] = useState("");
  const [vatCategoryId, setVatCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");

  // VAT lookup options for select control
  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT Applicable", value: "" }]);

  // Links to related recipe or inventory item
  const [recipeId, setRecipeId] = useState(null);
  const [inventoryItemId, setInventoryItemId] = useState(null);
  const [storeId, setStoreId] = useState(null);

  // --------------------------------------------------
  // EFFECT: load product and VAT categories
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!id) throw new Error("Missing product id");
        // Fetch product DTO
        const pRes = await fetch(`/api/products/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!pRes.ok) {
          const txt = await pRes.text().catch(() => null);
          throw new Error(txt || `Failed to load product (${pRes.status})`);
        }
        const pJson = await pRes.json();
        if (!mounted) return;

        // Populate form fields from response
        setProductName(pJson.productName ?? "");
        setVatCategoryId(pJson.vatCategoryId ? String(pJson.vatCategoryId) : "");
        setSellingPrice(pJson.sellingPrice != null ? String(Number(pJson.sellingPrice).toFixed(3)) : "");
        setCostPrice(pJson.costPrice != null ? String(Number(pJson.costPrice).toFixed(3)) : "");
        setDescription(pJson.description ?? "");
        setRecipeId(pJson.recipeId ?? null);
        setInventoryItemId(pJson.inventoryItemId ?? null);
        setStoreId(pJson.storeId ?? null);

        // Load VAT categories separately (non-blocking to product render)
        try {
          const vRes = await fetch('/api/products/vatcategories', { credentials: 'include' });
          if (vRes.ok) {
            const vJson = await vRes.json();
            if (!mounted) return;
            const opts = [{ label: "Select VAT Applicable", value: "" }, ...(Array.isArray(vJson) ? vJson.map(v => ({ label: v.vatCategoryName, value: String(v.vatCategoryId) })) : [])];
            setVatOptions(opts);
            // Ensure vatCategoryId reflects server value
            if (pJson.vatCategoryId) setVatCategoryId(String(pJson.vatCategoryId));
          }
        } catch (e) {
          // Non-fatal: VAT options are optional
          console.warn('Failed to load VAT categories', e);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err?.message || 'Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------------------------------
  // EFFECT: show price warning when selling < cost
  // --------------------------------------------------
  useEffect(() => {
    if (sellingPrice && costPrice && !isNaN(Number(sellingPrice)) && !isNaN(Number(costPrice))) {
      setShowPriceWarning(Number(sellingPrice) < Number(costPrice));
    } else {
      setShowPriceWarning(false);
    }
  }, [sellingPrice, costPrice]);

  // --------------------------------------------------
  // SUBMIT: validate and PUT updates
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!productName.trim()) return setError("Product name is required");
    if (!vatCategoryId) return setError("Select VAT category");
    if (!sellingPrice || isNaN(Number(sellingPrice))) return setError("Provide a valid selling price");
    setSaving(true);
    try {
      const payload = {
        productId: Number(id),
        productName: productName.trim(),
        vatCategoryId: Number(vatCategoryId),
        sellingPrice: Number(Number(sellingPrice).toFixed(3)),
        description: description || null
      };

      // Append storeId query only when current user is Organization Admin and we have a storeId from the product details
      let apiUrl = `/api/products/${encodeURIComponent(id)}`;
      const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
      if (isOrgAdmin && storeId) {
        apiUrl += `?storeId=${encodeURIComponent(storeId)}`;
      }

      // Persist changes
      const res = await fetch(apiUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to save product (${res.status})`);
      }
      // Navigate back to products list with a transient success state
      navigate('/products', { state: { updated: true, updatedName: `Product ${id}` } });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // HEADER ACTIONS: related recipe/item button
  // --------------------------------------------------
  const relatedButton = (() => {
    if (recipeId) {
      return {
        icon: <BiSolidPackage size={22} />,
        title: "Related Recipe",
        route: `/recipes/${recipeId}`
      };
    } else if (inventoryItemId) {
      return {
        icon: <BiSolidPackage size={22} />,
        title: "Related Inventory Item",
        route: `/inventory-items/${inventoryItemId}`
      };
    }
    return null;
  })();

  const headerActions = relatedButton ? [relatedButton] : [];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<BiSolidPackage size={55} />}
        title="Edit Product Details"
        descriptionLines={["Utilize the form to edit a product details in the store:", "The recipe will be utilized to enter sales if it is on sale, and for managing inventory items (deducting and calculating values)"]}
        actions={headerActions}
      />
      <FormBody onSubmit={handleSubmit} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <InputField label="Product Name" value={productName} onChange={setProductName} required placeholder="Product name" />
          </div>
          <div className="col-12 col-md-6">
            <SelectField label="VAT" value={vatCategoryId} onChange={setVatCategoryId} options={vatOptions} />
          </div>
          <div className="col-12 col-md-6">
            <InputField label="Selling Price (BHD)" value={sellingPrice} onChange={setSellingPrice} placeholder="XX.XXX BHD" inputProps={{ inputMode: 'decimal' }} />
          </div>
          <div className="col-12 col-md-6">
            <InputField label="Cost Price (BHD)" value={costPrice} readOnly disabled placeholder="XX.XXX BHD" inputProps={{ inputMode: 'decimal' }} />
          </div>
          <div className="col-12">
            <TextArea label="Product Description" value={description} onChange={setDescription} rows={5} />
          </div>
          {showPriceWarning && (
            <div className="col-12">
              <div className="alert alert-warning mb-0">Warning: Selling price is less than the cost price of the product.</div>
            </div>
          )}
          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}
          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate('/products')} submitLabel="Save" loading={saving} />
          </div>
        </div>
      </FormBody>
    </div>
  );
};

export default ProductEdit;
