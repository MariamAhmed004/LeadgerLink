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

const SalesNew = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [createdById, setCreatedById] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // summary modal
  const [showSummary, setShowSummary] = useState(false);
  const [saleSummary, setSaleSummary] = useState({
    saleId: null,
    itemCount: 0,
    totalAmount: 0,
    discountAmount: 0,
    amountPaid: 0,
    paymentMethodName: ""
  });

  // products separated into tabs
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);

  // derived amounts
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

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, pmRes, prodRes] = await Promise.all([
          fetch("/api/sales/store-users", { credentials: "include" }),
          fetch("/api/sales/payment-methods", { credentials: "include" }).catch(() => null),
          fetch("/api/products/for-current-store", { credentials: "include" }),
        ]);

        if (usersRes && usersRes.ok) {
          const udata = await usersRes.json();
          setUsers(udata || []);
          if ((udata || []).length > 0) setCreatedById(String(udata[0].userId ?? udata[0].UserId));
        } else {
          setUsers([]);
        }

        if (pmRes && pmRes.ok) {
          const pm = await pmRes.json();
          setPaymentMethods(pm || []);
          if ((pm || []).length > 0) setPaymentMethodId(String(pm[0].paymentMethodId ?? pm[0].id ?? ""));
        } else {
          // basic fallback
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
            // derive description and available quantity if provided by backend
            const description = p.description ?? p.productDescription ?? p.desc ?? "";
            const availableQty = p.inventoryItemQuantity ?? p.quantity ?? p.availableQuantity ?? null;
            const item = {
              productId: p.productId,
              name: p.productName,
              description: p.description || "",
              price: Number(p.sellingPrice).toFixed(3) + " BHD",
              quantity: Number(p.inventoryItemQuantity ?? 0)    
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
        setUsers([]);
        setPaymentMethods([
          { paymentMethodId: 1, name: "Cash" },
          { paymentMethodId: 2, name: "Card" },
        ]);
        setRecipes([]);
        setProducts([]);
      }
    };
    load();
  }, []);

  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // compute amount paid (total minus discount; discount can be amount or percent)
  const discountValue = parseNum(appliedDiscount);
  const discountDeduction = discountIsPercent ? (totalAmount * (discountValue / 100)) : discountValue;
  const amountPaid = Math.max(0, Number((totalAmount - discountDeduction).toFixed(3)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // basic validation: at least one item
    const validItems = (selection || []).filter(s => Number(s.productId) > 0 && Number(s.quantity) > 0);
    if (validItems.length === 0) {
      setError("Select at least one product or recipe with quantity > 0.");
      return;
    }

    setSaving(true);

    // IMPORTANT: if discount is percentage, send the computed amount, not the % value
    const appliedDiscountAmount = Number(discountDeduction.toFixed(3));

    const payload = {
      timestamp: timestamp.toISOString(),
      userId: createdById ? Number(createdById) : null,
      totalAmount: Number(totalAmount.toFixed(3)),
      appliedDiscount: appliedDiscountAmount,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
      notes: notes ? String(notes).trim() : null,
      items: validItems.map(s => ({ productId: Number(s.productId), quantity: Number(s.quantity) }))
    };

    try {
      const res = await fetch("/api/sales", {
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
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Timestamp" value={timestamp} onChange={setTimestamp} required />
          </div>

          <div className="col-12">
            <TabbedMenu
              tabs={tabs}
              onSelectionChange={(sel) => setSelection(sel)}
            />
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
          navigate("/sales");
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
          <button className="btn btn-primary" onClick={() => { setShowSummary(false); navigate("/sales"); }}>
            OK
          </button>
        </div>
      </InfoModal>
    </div>
  );
};

export default SalesNew;