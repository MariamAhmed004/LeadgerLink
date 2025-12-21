import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaFileInvoice, FaArrowLeft, FaPrint, FaPencilAlt } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";
import { useAuth } from "../../Context/AuthContext";

/*
  SaleView.jsx
  Summary:
  - Displays a detailed view of a single sale including amounts, items and metadata.
  - Loads sale DTO from the API and shows actions (back, print, edit) based on role.
*/

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

// Format numeric values as BHD with 3 decimals
const formatMoney = (v) => {
  if (v == null) return "";
  try {
    return `BHD ${Number(v).toFixed(3)}`;
  } catch {
    return String(v);
  }
};

// Format ISO/Date-like values to local string, safe against invalid inputs
const formatDateTime = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
  } catch {
    return String(val);
  }
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
const SaleView = () => {
  // route + navigation helpers
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  // sale DTO loaded from API
  const [sale, setSale] = useState(null);
  // loading and error UI flags
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // EFFECT: load sale on mount / id change
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // fetch sale detail by id
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

  // --------------------------------------------------
  // DERIVED VALUES: map possible DTO shapes to expected fields
  // --------------------------------------------------
  // Support multiple possible field namings returned by API
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

  // --------------------------------------------------
  // AUTH: role-based permissions
  // --------------------------------------------------
  // Allow edit if user is Store Manager OR Organization Admin
  const isStoreManager = (loggedInUser?.roles || []).some(r => r === "Store Manager" || r === "Organization Admin");

  // --------------------------------------------------
  // HEADER / DETAIL / METADATA PREPARATION
  // --------------------------------------------------
  const headerProps = {
    // Icon and title for header
    icon: <FaFileInvoice size={28} />,
    title: sale ? `Sale #${saleId}` : "Sale",
    // Subtitle shows date and total when available
    descriptionLines: sale
      ? [formatDateTime(timestamp), `Total: ${formatMoney(totalAmount)}`]
      : ["Sale details"],
    actions: [],
  };

  // Main detail rows shown in the primary panel
  const detailRows = sale
    ? [
        { label: "Payment Method", value: paymentMethodName || "" },
        { label: "Total Amount", value: formatMoney(totalAmount) },
        { label: "Applied Discount", value: formatMoney(appliedDiscount) },
        { label: "Notes", value: notes || "" },
        { label: "Items Count", value: items.length },
      ]
    : [];

  // Metadata rows such as who created and timestamps
  const metadataRows = sale
    ? [
        { label: "Created By", value: createdByName || "" },
        { label: "Created At", value: formatDateTime(createdAt) },
        { label: "Updated At", value: formatDateTime(updatedAt) },
      ]
    : [];

  // --------------------------------------------------
  // ACTIONS: footer buttons (Back, Print, optionally Edit)
  // --------------------------------------------------
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

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
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