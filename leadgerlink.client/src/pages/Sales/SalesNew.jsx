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

const SalesNew = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [createdById, setCreatedById] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // derived amounts
  const [selection, setSelection] = useState([]); // [{tabLabel,index,name,price,quantity}]
  const computeTotalFromSelection = () =>
    selection.reduce((sum, it) => {
      // price may be string "X.XXX BHD" or number; parse numeric part
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
        const [usersRes, pmRes] = await Promise.all([
          fetch("/api/sales/store-users", { credentials: "include" }),
          fetch("/api/paymentmethods", { credentials: "include" }).catch(() => null),
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
          setPaymentMethods([
            { paymentMethodId: 1, name: "Cash" },
            { paymentMethodId: 2, name: "Card" },
          ]);
        }
      } catch (err) {
        console.error(err);
        setUsers([]);
        setPaymentMethods([
          { paymentMethodId: 1, name: "Cash" },
          { paymentMethodId: 2, name: "Card" },
        ]);
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
    setSaving(true);

    const payload = {
      timestamp: timestamp.toISOString(),
      userId: createdById ? Number(createdById) : null,
      totalAmount: Number(totalAmount.toFixed(3)),
      appliedDiscount: discountValue,
      // appliedDiscountIsPercent: discountIsPercent, // add if backend needs it
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
      notes: null,
      // Optionally include selection details for server-side reconciliation later
      // items: selection.map(s => ({ name: s.name, price: parseFloat(/*...*/), quantity: s.quantity }))
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

      navigate("/sales");
    } catch (err) {
      console.error(err);
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // sample items for the TabbedMenu preview
  const sampleRecipes = [
    { name: "Chicken Shawarma", description: "Spiced chicken, sliced", price: "3.000 BHD", quantity: 10 },
    { name: "Veggie Wrap", description: "Fresh vegetables and sauce", price: "2.000 BHD", quantity: 8 },
  ];

  const sampleProducts = [
    { name: "Bottle Water", description: "500ml", price: "0.200 BHD", quantity: 50 },
    { name: "Soda Can", description: "330ml", price: "0.300 BHD", quantity: 30 },
  ];

  const tabs = [
    {
      label: "Recipes",
      items: sampleRecipes,
      cardComponent: (item) => <MenuTabCard data={item} />,
    },
    {
      label: "Products",
      items: sampleProducts,
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
    </div>
  );
};

export default SalesNew;