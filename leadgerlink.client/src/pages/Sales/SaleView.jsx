import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaFileInvoice, FaArrowLeft, FaPrint } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";
import DetailPageAction from "../../components/Listing/DetailPageAction";

// Helper to read multiple possible property names from server DTOs
const firstDefined = (obj, ...keys) => {
  for (const k of keys) {
    if (obj == null) break;
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  }
  return undefined;
};

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
          // fallback: attempt to fetch list and find by id
          if (res.status === 404) {
            // try list endpoint as fallback
            const listRes = await fetch("/api/sales", { credentials: "include" });
            if (listRes.ok) {
              const list = await listRes.json();
              const found = (list || []).find((s) => String(firstDefined(s, "id", "saleId", "Id")) === String(id));
              if (mounted) {
                if (found) setSale(found);
                else setError(`Sale ${id} not found.`);
              }
              return;
            }
          }
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

  // prepare props for DetailViewWithMetadata
  const headerProps = {
    icon: <FaFileInvoice size={28} />,
    title: sale ? `Sale #${firstDefined(sale, "id", "saleId", "Id") ?? id}` : "Sale",
    descriptionLines: sale
      ? [
          formatDateTime(firstDefined(sale, "timestamp", "Timestamp")),
          `Total: ${formatMoney(firstDefined(sale, "totalAmount", "amount", "Amount"))}`,
        ]
      : ["Sale details"],
    actions: [], // header actions are optional; keep empty here
  };

  // build main detail rows (label / value)
  const detailRows = sale
    ? [
        { label: "Timestamp", value: formatDateTime(firstDefined(sale, "timestamp", "Timestamp")) },
        { label: "Created By", value: firstDefined(sale, "createdByName", "CreatedByName", "createdBy") || "" },
        { label: "Payment Method", value: firstDefined(sale, "paymentMethodName", "PaymentMethodName") || "" },
        { label: "Total Amount", value: formatMoney(firstDefined(sale, "totalAmount", "amount", "Amount")) },
        { label: "Applied Discount", value: formatMoney(firstDefined(sale, "appliedDiscount", "AppliedDiscount")) },
        { label: "Notes", value: firstDefined(sale, "notes", "Notes") || "" },
      ]
    : [];

  // metadata displayed to the side: items count, distinct products, created at/updated at ids etc.
  const saleItems = firstDefined(sale, "saleItems", "SaleItems") || [];
  const metadataRows = sale
    ? [
        { label: "Items Count", value: Array.isArray(saleItems) ? saleItems.length : "" },
        {
          label: "Unique Products",
          value: Array.isArray(saleItems) ? new Set(saleItems.map((si) => firstDefined(si, "productId", "ProductId", "productId") || firstDefined(si, "product", "Product"))).size : "",
        },
        { label: "Store ID", value: firstDefined(sale, "storeId", "StoreId") || "" },
        { label: "Sale ID", value: firstDefined(sale, "saleId", "SaleId", "id", "Id") || "" },
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
  ];

  return (
    <DetailViewWithMetadata
      headerProps={headerProps}
      detail={{ title: "Sale Details", rows: detailRows }}
      metadata={{ title: "Summary", rows: metadataRows }}
      actions={footerActions}
    />
  );
};

export default SaleView;