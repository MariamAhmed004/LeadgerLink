import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import TabbedMenu from "../../components/Form/TabbedMenu";
import MenuTabCard from "../../components/Form/MenuTabCard";
import { FaFileInvoice } from "react-icons/fa";
import TimestampField from "../../components/Form/TimestampField";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import FormActions from "../../components/Form/FormActions";
import InputWithButton from "../../components/Form/InputWithButton";
import InfoModal from "../../components/Ui/InfoModal";
import TextArea from "../../components/Form/TextArea";
import { useAuth } from "../../Context/AuthContext";

/*
  SaleEdit.jsx
  Summary:
  - Edit an existing sale: loads sale details, products and payment methods,
    allows adjusting items, discount and payment, then updates the sale via PUT.
*/

// --------------------------------------------------
// COMPONENT / STATE
// --------------------------------------------------
const SaleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // core editable fields
  const [timestamp, setTimestamp] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // product lists / selection
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selection, setSelection] = useState([]);

  // Loading state for products/recipes
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Capture storeId from fetched sale details (used when user is Organization Admin)
  const [fetchedStoreId, setFetchedStoreId] = useState("");

  // --------------------------------------------------
  // HELPERS: numeric parsing and derived amounts
  // --------------------------------------------------
  // Safe numeric parse helper
  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // total computed from current selection (price * quantity)
  const totalAmount = selection.reduce((sum, it) => {
    const priceNum = typeof it.price === "string" ? Number((it.price.match(/[0-9.]+/) || [0])[0]) : Number(it.price || 0);
    const qtyNum = Number(it.quantity || 0);
    if (!Number.isFinite(priceNum) || !Number.isFinite(qtyNum)) return sum;
    return sum + priceNum * qtyNum;
  }, 0);

  // compute discount and amountPaid (handles percent vs absolute)
  const discountValue = parseNum(appliedDiscount);
  const discountDeduction = discountIsPercent ? (totalAmount * (discountValue / 100)) : discountValue;
  const amountPaid = Math.max(0, Number((totalAmount - discountDeduction).toFixed(3)));

  // --------------------------------------------------
  // EFFECT: load sale, payment methods and products on mount
  // --------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoadingProducts(true);
      try {
        // Fetch sale first so we have storeId from the sale details
        const saleRes = await fetch(`/api/sales/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!saleRes.ok) {
          const txt = await saleRes.text().catch(() => null);
          throw new Error(txt || `Failed to load sale (${saleRes.status})`);
        }
        const sale = await saleRes.json();

        // populate core fields from returned sale DTO
        setTimestamp(sale.timestamp ? new Date(sale.timestamp) : new Date());
        setPaymentMethodId(sale.paymentMethodId ? String(sale.paymentMethodId) : "");
        setAppliedDiscount(sale.appliedDiscount != null ? String(Number(sale.appliedDiscount)) : "");
        setNotes(sale.notes || "");

        // Capture storeId from sale details (do NOT take from user context)
        setFetchedStoreId(sale.storeId != null ? String(sale.storeId) : "");

        // Decide product URL: include storeId query only when loggedInUser is Organization Admin
        const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
        const productUrl = (isOrgAdmin && sale.storeId)
          ? `/api/products/for-current-store?storeId=${encodeURIComponent(sale.storeId)}`
          : "/api/products/for-current-store";

        // Fetch payment methods and products in parallel
        const [pmRes, prodRes] = await Promise.all([
          fetch("/api/sales/payment-methods", { credentials: "include" }),
          fetch(productUrl, { credentials: "include" })
        ]);

        if (pmRes.ok) {
          const pm = await pmRes.json();
          setPaymentMethods(pm || []);
        }

        if (prodRes.ok) {
          const list = await prodRes.json();
          const arr = Array.isArray(list) ? list : (list.items || []);
          const rec = [];
          const oth = [];

          // map sale items for preselection
          const byProductIdQty = new Map((sale.saleItems || []).map(si => [Number(si.productId), Number(si.quantity)]));

          (arr || []).forEach(p => {
            const description = p.description ?? "";
            const isRecipe =
              (p.isRecipe === true) ||
              (String(p.source || "").toLowerCase() === "recipe") ||
              (p.recipeId != null);

            const item = {
              productId: p.productId,
              name: p.productName,
              description,
              price: Number(p.sellingPrice).toFixed(3) + " BHD",
              // use backend-provided availableQuantity for recipes, fallback to inventoryItemQuantity
              quantity: isRecipe ? Number(p.availableQuantity ?? p.inventoryItemQuantity ?? 0) : Number(p.inventoryItemQuantity ?? 0),
              initialSelectedQty: byProductIdQty.get(Number(p.productId)) || 0
            };

            if (isRecipe) rec.push(item); else oth.push(item);
          });

          // populate recipe and product tabs
          setRecipes(rec);
          setProducts(oth);
        } else {
          // If product fetch failed, still allow editing other fields
          console.warn("Failed to load products for sale edit");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, [id, loggedInUser]);

  // --------------------------------------------------
  // SUBMIT: validate and PUT updates to API
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validItems = (selection || []).filter(s => Number(s.productId) > 0 && Number(s.quantity) > 0);
    if (validItems.length === 0) {
      setError("Select at least one product or recipe with quantity > 0.");
      return;
    }

    setSaving(true);

    const appliedDiscountAmount = Number(discountDeduction.toFixed(3));
    const payload = {
      timestamp: timestamp.toISOString(),
      totalAmount: Number(totalAmount.toFixed(3)),
      appliedDiscount: appliedDiscountAmount,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
      notes: notes ? String(notes).trim() : null,
      items: validItems.map(s => ({ productId: Number(s.productId), quantity: Number(s.quantity) }))
    };

    try {
      // Construct API URL, append fetched storeId only when logged-in user is Organization Admin
      let apiUrl = `/api/sales/${encodeURIComponent(id)}`;
      if (loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin")) {
        if (fetchedStoreId) {
          apiUrl += `?storeId=${encodeURIComponent(fetchedStoreId)}`;
        } else {
          // If sale details did not include a storeId, fail early rather than guessing from user context
          throw new Error("Unable to determine store ID from sale details.");
        }
      }

      const res = await fetch(apiUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Server returned ${res.status}`);
      }

        navigate("/sales", { state: { type: "updated", name: `Sale "${id}"` } });    } catch (err) {
      console.error(err);
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // TABS CONFIG
  // --------------------------------------------------
  const tabs = [
    { label: "Recipes", items: recipes, cardComponent: (item) => <MenuTabCard data={item} /> },
    { label: "Products", items: products, cardComponent: (item) => <MenuTabCard data={item} /> },
  ];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaFileInvoice size={28} />}
        title="Edit Sale"
        descriptionLines={["Edit the sale details and items."]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4 ">
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Timestamp" value={timestamp} onChange={setTimestamp} required />
          </div>

          <div className="col-12">
            {loadingProducts ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border text-primary me-2" role="status" aria-label="Loading products"></div>
                <span>Loading products...</span>
              </div>
            ) : (
              <TabbedMenu tabs={tabs} onSelectionChange={(sel) => setSelection(sel)} />
            )}
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Total Amount (BHD)" required type="number" value={String(totalAmount.toFixed(3))} onChange={() => {}} readOnly disabled placeholder="0.000" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputWithButton
              label={`Applied Discount (${discountIsPercent ? "%" : "BHD"})`}
              value={appliedDiscount}
              onChange={setAppliedDiscount}
              type="number"
              placeholder={discountIsPercent ? "0.0 %" : "0.000 BHD"}
              buttonLabel={discountIsPercent ? "As Amount" : "As %"}
              buttonVariant="secondary"
              onButtonClick={(e) => { e.preventDefault(); setDiscountIsPercent((p) => !p); }}
              inputProps={{ step: discountIsPercent ? "0.1" : "0.001", min: "0", inputMode: "decimal" }}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Amount Paid (BHD)" value={String(amountPaid.toFixed(3))} onChange={() => {}} readOnly disabled placeholder="0.000" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Payment Method" required value={paymentMethodId} onChange={setPaymentMethodId} options={[{ label: "Select payment method", value: "" }, ...paymentMethods.map((p) => ({ label: p.name, value: String(p.paymentMethodId) }))]} />
          </div>

          <div className="col-12 text-start">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} placeholder="Add any notes for this sale" />
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-center align-items-center">
            <FormActions onCancel={() => navigate(`/sales/${id}`)} submitLabel="Save Changes" loading={saving} />
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

export default SaleEdit;
