import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SalesNew.jsx
  Summary:
  - Page to create a new sale. Loads products, payment methods and (for org admins) stores.
  - Lets the user pick products/recipes, set discount and payment, then submit a sale.
  - Shows a summary modal after successful save.
*/

// --------------------------------------------------
// STATE / CONSTANTS
// --------------------------------------------------
const SalesNew = () => {
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // sale header / basic fields
  const [createdById, setCreatedById] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // org admin: stores & selected store id (required by effects that reference them)
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // summary modal state shown after saving
  const [showSummary, setShowSummary] = useState(false);
  const [saleSummary, setSaleSummary] = useState({
    saleId: null,
    itemCount: 0,
    totalAmount: 0,
    discountAmount: 0,
    amountPaid: 0,
    paymentMethodName: ""
  });

  // products separated into tabs (recipes vs products)
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);

  // Add a loading state for products
  const [productsLoading, setProductsLoading] = useState(false);

  // derived amounts / selection state
  const [selection, setSelection] = useState([]); // [{tabLabel,index,productId,name,price,quantity}]
  const computeTotalFromSelection = () =>
    selection.reduce((sum, it) => {
      const priceNum = typeof it.price === "string"
        ? Number((it.price.match(/[0-9.]+/) || [0])[0])
        : Number(it.price || 0);
      const qtyNum = Number(it.quantity || 0);
      if (!Number.isFinite(priceNum) || !Number.isFinite(qtyNum)) return sum;
      return sum + priceNum * qtyNum;
    }, 0);

  const totalAmount = computeTotalFromSelection();

  // determine org admin (role-based behavior)
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin") || roles.includes("Application Admin");

  // --------------------------------------------------
  // EFFECT: initialize createdBy from authenticated user
  // --------------------------------------------------
  useEffect(() => {
    // Ensure createdById defaults to the authenticated user immediately
    if (loggedInUser?.userId != null) {
      setCreatedById(String(loggedInUser.userId));
    }
  }, [loggedInUser]);

  // --------------------------------------------------
  // EFFECT: load stores for org admins
  // --------------------------------------------------
  useEffect(() => {
    if (!isOrgAdmin) return;

    const loadStores = async () => {
      try {
        const orgId =
          loggedInUser?.orgId ??
          null;

        const url = orgId ? `/api/stores?organizationId=${encodeURIComponent(orgId)}` : "/api/stores";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const list = await res.json();
          const arr = Array.isArray(list) ? list : (list.items || []);
          setStores(arr || []);
          if ((arr || []).length > 0 && !selectedStoreId) {
            const firstId = arr[0].storeId ?? arr[0].StoreId ?? null;
            if (firstId != null) setSelectedStoreId(String(firstId));
          }
        } else {
          setStores([]);
        }
      } catch (err) {
        console.error("Failed to load stores", err);
        setStores([]);
      }
    };

    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser, isOrgAdmin]);

  // --------------------------------------------------
  // EFFECT: load users, payment methods and products
  // --------------------------------------------------
  useEffect(() => {
    // For org admins we only run when a store is selected.
    if (isOrgAdmin && !selectedStoreId) {
      // clear lists until a store is chosen
      setRecipes([]);
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    const load = async () => {
      setProductsLoading(true);
      try {
        const pmUrl = "/api/sales/payment-methods";
        const productsUrl =
          isOrgAdmin && selectedStoreId
            ? `/api/products/for-current-store?storeId=${encodeURIComponent(selectedStoreId)}`
            : "/api/products/for-current-store";
        const [pmRes, prodRes] = await Promise.all([
          fetch(pmUrl, { credentials: "include" }).catch(() => null),
          fetch(productsUrl, { credentials: "include" }).catch(() => null),
        ]);


        if (pmRes && pmRes.ok) {
          const pm = await pmRes.json();
          setPaymentMethods(pm || []);
          if ((pm || []).length > 0) setPaymentMethodId(String(pm[0].paymentMethodId ?? pm[0].id ?? ""));
        } else {
          setPaymentMethods([
            { paymentMethodId: 1, name: "Cash" },
            { paymentMethodId: 2, name: "Card" },
          ]);
        }

        if (prodRes && prodRes.ok) {
          const list = await prodRes.json();
          const arr = Array.isArray(list) ? list : (list.items || []);
          const rec = [];
          const oth = [];
          (arr || []).forEach(p => {
            const description = p.description ?? p.productDescription ?? p.desc ?? "";
            const availableQty = p.availableQuantity ?? p.inventoryItemQuantity ?? p.quantity ?? null;
            const item = {
              productId: p.productId ?? p.productId,
              name: p.productName ?? p.productName,
              description,
              price: (p.sellingPrice != null) ? Number(p.sellingPrice).toFixed(3) + " BHD" : "NA",
              quantity: Number(availableQty ?? 0)
            };
            const isRecipe = (p.isRecipe === true) || (String(p.source || "").toLowerCase() === "recipe");
            if (isRecipe) rec.push(item); else oth.push(item);
          });
          setRecipes(rec);
          setProducts(oth);
        } else {
          setRecipes([]);
          setProducts([]);
        }
      } catch (err) {
        console.error(err);
        setPaymentMethods([
          { paymentMethodId: 1, name: "Cash" },
          { paymentMethodId: 2, name: "Card" },
        ]);
        setRecipes([]);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    load();
  }, [selectedStoreId, loggedInUser, isOrgAdmin]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // compute amount paid (total minus discount; discount can be amount or percent)
  const discountValue = parseNum(appliedDiscount);
  const discountDeduction = discountIsPercent ? (totalAmount * (discountValue / 100)) : discountValue;
  const amountPaid = Math.max(0, Number((totalAmount - discountDeduction).toFixed(3)));

  // --------------------------------------------------
  // SUBMIT: save sale
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // basic validation: at least one item
    const validItems = (selection || []).filter(s => Number(s.productId) > 0 && Number(s.quantity) > 0);
    if (validItems.length === 0) {
      setError("Select at least one product or recipe with quantity > 0.");
      return;
    }

    // org admin must pick a store
    if (isOrgAdmin && !selectedStoreId) {
      setError("Select a store for this sale.");
      return;
    }

    setSaving(true);

    // IMPORTANT: if discount is percentage, send the computed amount, not the % value
    const appliedDiscountAmount = Number(discountDeduction.toFixed(3));

    const payload = {
      timestamp: timestamp.toISOString(),
      // Always use the authenticated user's id as CreatedBy
      userId: loggedInUser?.userId != null ? Number(loggedInUser.userId) : (createdById ? Number(createdById) : null),
      totalAmount: Number(totalAmount.toFixed(3)),
      appliedDiscount: appliedDiscountAmount,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
      notes: notes ? String(notes).trim() : null,
      items: validItems.map(s => ({ productId: Number(s.productId), quantity: Number(s.quantity) }))
    };

    try {
      // if org admin include storeId as query param so backend will use it
      const postUrl = (isOrgAdmin && selectedStoreId)
        ? `/api/sales?storeId=${encodeURIComponent(selectedStoreId)}`
        : "/api/sales";

      const res = await fetch(postUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Server returned ${res.status}`);
      }

      // parse sale id from response if provided
      let saleId = null;
      try {
        const respJson = await res.json();
        saleId = respJson?.saleId ?? null;
      } catch { /* ignore parse issues, modal will show without id */ }

      // prepare summary and show modal (do not navigate yet)
      const pmName = (paymentMethods.find(pm => String(pm.paymentMethodId ?? pm.id) === String(paymentMethodId))?.name) || "";
      setSaleSummary({
        saleId,
        itemCount: validItems.length,
        totalAmount: Number(totalAmount.toFixed(3)),
        discountAmount: appliedDiscountAmount,
        amountPaid: Number(amountPaid.toFixed(3)),
        paymentMethodName: pmName
      });
      setShowSummary(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // UI: tabs configuration
  // --------------------------------------------------
  const tabs = [
    {
      label: "Recipes",
      items: recipes,
      cardComponent: (item) => <MenuTabCard data={item} />,
    },
    {
      label: "Products",
      items: products,
      cardComponent: (item) => <MenuTabCard data={item} />,
    },
  ];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaFileInvoice size={28} />}
        title="Create Sale"
        descriptionLines={[
          "Fill In the following fields to add the sale entry",
          "Find Recipe Products in the Recipes tab, and Inventory Items Product in Others tab Add the Applied Discount in % or BHD amount "
        ]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4 ">
          {/* Store selector for org admins */}
          {isOrgAdmin && (
            <div className="col-12 col-md-6 text-start">
              <SelectField
                label="Store"
                value={selectedStoreId}
                onChange={setSelectedStoreId}
                options={[{ label: "Select store", value: "" }, ...(stores || []).map(s => ({ label: s.storeName ?? s.store_nome ?? String(s), value: String(s.storeId ?? s.StoreId ?? "") }))]}
              />
            </div>
          )}

          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Timestamp" value={timestamp} onChange={setTimestamp} required />
          </div>

          <div className="col-12">
            {productsLoading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading products...
              </div>
            ) : (
              <TabbedMenu
                tabs={tabs}
                onSelectionChange={(sel) => setSelection(sel)}
              />
            )}
          </div>

          {/* Total Amount (read-only derived from selection) */}
          <div className="col-12 col-md-6 text-start">
            <InputField
              label="Total Amount (BHD)"
              required
              type="number"
              value={String(totalAmount.toFixed(3))}
              onChange={() => {}}
              readOnly
              disabled
              placeholder="0.000"
            />
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
              onButtonClick={(e) => {
                e.preventDefault();
                setDiscountIsPercent((p) => !p);
              }}
              inputProps={{ step: discountIsPercent ? "0.1" : "0.001", min: "0", inputMode: "decimal" }}
            />
          </div>

          {/* Amount Paid (read-only) */}
          <div className="col-12 col-md-6 text-start">
            <InputField
              label="Amount Paid (BHD)"
              value={String(amountPaid.toFixed(3))}
              onChange={() => {}}
              readOnly
              disabled
              placeholder="0.000"
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Payment Method"
              required
              value={paymentMethodId}
              onChange={setPaymentMethodId}
              options={[{ label: "Select payment method", value: "" }, ...paymentMethods.map((p) => ({ label: p.name ?? p.paymentMethodName ?? p.PaymentMethodName, value: String(p.paymentMethodId ?? p.id ?? "") }))]}
            />
          </div>

          {/* Notes */}
          <div className="col-12 text-start">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} placeholder="Add any notes for this sale" />
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-center align-items-center">
            <FormActions onCancel={() => navigate("/sales")} submitLabel="Save Sale" loading={saving} />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}
        </div>
      </FormBody>

      {/* Summary modal shown after successful save */}
      <InfoModal
        show={showSummary}
        title="Sale Summary"
        onClose={() => {
            setShowSummary(false);
            navigate("/sales", { state: { type: "added", name: `Sale "${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"` } });
        }}
      >
        <div className="mb-2">
          {saleSummary.saleId ? <div className="mb-1"><strong>Sale ID:</strong> {saleSummary.saleId}</div> : null}
          <div className="mb-1"><strong>Items Selected:</strong> {saleSummary.itemCount}</div>
          <div className="mb-1"><strong>Total Amount:</strong> BHD {saleSummary.totalAmount.toFixed(3)}</div>
          <div className="mb-1"><strong>Discount Applied:</strong> BHD {saleSummary.discountAmount.toFixed(3)}</div>
          <div className="mb-1"><strong>Amount Paid:</strong> BHD {saleSummary.amountPaid.toFixed(3)}</div>
          {saleSummary.paymentMethodName && (
            <div className="mb-1"><strong>Payment Method:</strong> {saleSummary.paymentMethodName}</div>
          )}
        </div>
        <div className="mt-3 text-end">
                  <button className="btn btn-primary" onClick={() => {
                      setShowSummary(false); 
                      navigate("/sales", { state: { type: "added", name: `Sale "${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"` } });
 }}>
            OK
          </button>
        </div>
      </InfoModal>
    </div>
  );
};

export default SalesNew;