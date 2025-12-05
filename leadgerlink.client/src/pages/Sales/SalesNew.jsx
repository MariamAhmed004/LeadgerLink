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

/*
  Create Sale page - labels above inputs, plain form, full-width TabbedMenu,
  fields arranged half-row using Bootstrap gutters for spacing.
*/

const SalesNew = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [createdById, setCreatedById] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
          // fallback basic options if endpoint not available
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      timestamp: timestamp.toISOString(),
      userId: createdById ? Number(createdById) : null,
      totalAmount: totalAmount ? Number(totalAmount) : 0,
      appliedDiscount: appliedDiscount ? Number(appliedDiscount) : 0,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
      notes: null,
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
    { name: "Chicken Shawarma", description: "Spiced chicken, sliced", price: "3.000 BHD", quantity: 10, onSelect: () => {}, isSelected: false },
    { name: "Veggie Wrap", description: "Fresh vegetables and sauce", price: "2.000 BHD", quantity: 8, onSelect: () => {}, isSelected: false },
  ];

  const sampleProducts = [
    { name: "Bottle Water", description: "500ml", price: "0.200 BHD", quantity: 50, onSelect: () => {}, isSelected: false },
    { name: "Soda Can", description: "330ml", price: "0.300 BHD", quantity: 30, onSelect: () => {}, isSelected: false },
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
              descriptionLines={["Fill In the following fields to add the sale entry", "Find Recipe Products in the Recipes tab, and Inventory Items Product in Others tab Add the Applied Discount in % or BHD amount "]}
        actions={[]}
      />

      {/* plain form (no card/shadow) */}
      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4 ">
          {/* Timestamp (half row) - label appears above input via TimestampField */}
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Timestamp" value={timestamp} onChange={setTimestamp} required />
          </div>

          {/* Tabbed menu full width - make menu area taller and scrollable */}
                  <div className="col-12">
                      <TabbedMenu tabs={tabs} />
                  </div>

          {/* Total Amount and Applied Discount - labels on top */}
          <div className="col-12 col-md-6 text-start">
            <InputField
              label="Total Amount"
              required
              type="number"
              step="0.001"
              min="0"
              value={totalAmount}
              onChange={setTotalAmount}
              placeholder="0.000"
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField
              label="Applied Discount"
              required={false}
              type="number"
              step="0.001"
              min="0"
              value={appliedDiscount}
              onChange={setAppliedDiscount}
              placeholder="0.000"
            />
          </div>

          {/* Payment method + actions */}
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

          {/* error message full width */}
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