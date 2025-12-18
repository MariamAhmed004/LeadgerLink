import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaFileInvoice, FaArrowLeft, FaPrint, FaPencilAlt } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";
import { useAuth } from "../../Context/AuthContext";

const formatMoney = (v) => {
  if (v == null) return "";
  try {
    return `BHD ${Number(v).toFixed(3)}`;
  } catch {
    return String(v);
  }
};

const formatDateTime = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
  } catch {
    return String(val);
  }
};

const SaleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/sales/${id}`, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load sale ${id} (status ${res.status})`);
        }
        const json = await res.json();
        if (mounted) setSale(json);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load sale");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const saleId = sale?.saleId ?? sale?.id ?? id;
  const timestamp = sale?.timestamp ?? sale?.createdAt ?? null;
  const totalAmount = sale?.totalAmount ?? sale?.amount ?? null;
  const appliedDiscount = sale?.appliedDiscount ?? null;
  const notes = sale?.notes ?? "";
  const paymentMethodName = sale?.paymentMethodName ?? "";
  const createdByName = sale?.createdByName ?? sale?.createdBy ?? "";
  const createdAt = sale?.createdAt ?? sale?.timestamp ?? null;
  const updatedAt = sale?.updatedAt ?? sale?.modifiedAt ?? null;
  const items = Array.isArray(sale?.saleItems) ? sale.saleItems : [];

  // Allow edit if user is Store Manager OR Organization Admin
  const isStoreManager = (loggedInUser?.roles || []).some(r => r === "Store Manager" || r === "Organization Admin");

  const headerProps = {
    icon: <FaFileInvoice size={28} />,
    title: sale ? `Sale #${saleId}` : "Sale",
    descriptionLines: sale
      ? [formatDateTime(timestamp), `Total: ${formatMoney(totalAmount)}`]
      : ["Sale details"],
    actions: [],
  };

  const detailRows = sale
    ? [
        { label: "Payment Method", value: paymentMethodName || "" },
        { label: "Total Amount", value: formatMoney(totalAmount) },
        { label: "Applied Discount", value: formatMoney(appliedDiscount) },
        { label: "Notes", value: notes || "" },
        { label: "Items Count", value: items.length },
      ]
    : [];

  const metadataRows = sale
    ? [
        { label: "Created By", value: createdByName || "" },
        { label: "Created At", value: formatDateTime(createdAt) },
        { label: "Updated At", value: formatDateTime(updatedAt) },
      ]
    : [];

  const footerActions = [
    {
      icon: <FaArrowLeft />,
      title: "Back to Sales",
      onClick: () => navigate("/sales"),
    },
    {
      icon: <FaPrint />,
      title: "Print",
      onClick: () => window.print(),
    },
    ...(isStoreManager
      ? [
          {
            icon: <FaPencilAlt />,
            title: "Edit Sale",
            onClick: () => navigate(`/sales/edit/${saleId}`),
          },
        ]
      : []),
  ];

  return (
    <DetailViewWithMetadata
      headerProps={headerProps}
      detail={{
        title: sale ? `Sale #${saleId} made at ${formatDateTime(timestamp)}` : "Sale Details",
        rows: detailRows,
      }}
      metadata={{ title: "Summary", rows: metadataRows }}
      actions={footerActions}
    />
  );
};

export default SaleView;