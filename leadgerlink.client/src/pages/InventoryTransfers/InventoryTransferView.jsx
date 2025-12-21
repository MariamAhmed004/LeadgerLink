import React, { useEffect, useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";

/*
  InventoryTransferView.jsx
  Summary:
  - Displays a detailed view of a single inventory transfer, including items,
    timestamps and metadata. Loads transfer DTO from the API and renders using
    the DetailViewWithMetadata template.
*/


// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
const InventoryTransferView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  // Loading / error flags and the fetched transfer DTO
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transfer, setTransfer] = useState(null);

  // --------------------------------------------------
  // EFFECT: load transfer on mount / id change
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setError("Missing transfer id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/inventorytransfers/${encodeURIComponent(id)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }

        const json = await res.json();
        if (!mounted) return;
        setTransfer(json);
      } catch (ex) {
        console.error("Failed to load transfer", ex);
        if (mounted) setError(ex?.message || "Failed to load transfer");
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
  // HELPERS: formatting and display utilities
  // --------------------------------------------------
  // Helper to format datetimes safely, falls back to raw string
  const fmt = (val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch { /* empty */ }
    // fallback: return raw string
    return String(val);
  };

  // --------------------------------------------------
  // HEADER PREPARATION
  // --------------------------------------------------
  const headerProps = {
    icon: <FaExchangeAlt size={45} />,
    title: transfer ? `Transfer ${transfer.transferId}` : "View Transfer",
    descriptionLines: [],
  };

  // --------------------------------------------------
  // RENDER: loading / error / missing resource handling
  // --------------------------------------------------
  if (loading) {
    const detail = { title: "Loading...", rows: [] };
    const metadata = { title: "", rows: [] };
    return (
      <DetailViewWithMetadata
        headerProps={headerProps}
        detail={detail}
        metadata={metadata}
        actions={[]}
      />
    );
  }

  if (error) {
    const detail = { title: "Error", rows: [{ label: "Message", value: error }] };
    const metadata = { title: "", rows: [] };
    return (
      <DetailViewWithMetadata
        headerProps={headerProps}
        detail={detail}
        metadata={metadata}
        actions={[]}
      />
    );
  }

  if (!transfer) {
    const detail = { title: "Not found", rows: [] };
    const metadata = { title: "", rows: [] };
    return (
      <DetailViewWithMetadata
        headerProps={headerProps}
        detail={detail}
        metadata={metadata}
        actions={[]}
      />
    );
  }

  // --------------------------------------------------
  // DATA PROCESSING: build items list JSX
  // --------------------------------------------------
  // Build items list JSX with image fallback and name resolution
  const itemsJsx =
    transfer.items && transfer.items.length ? (
      <ul style={{ margin: 0, paddingLeft: "0", listStyle: "none" }}>
        {transfer.items.map((it) => {
          // resolve image source: prefer explicit url; else build from inventoryItemId; else base64
          const explicitUrl = it.imageUrl || it.inventoryItemImageUrl || null;
          const builtUrl = it.inventoryItemId ? `/api/inventoryitems/${encodeURIComponent(it.inventoryItemId)}/image` : null;
          const base64 = it.imageBase64 || it.inventoryItemImage || null;
          const src = explicitUrl || builtUrl || (base64 ? `data:image/jpeg;base64,${base64}` : null);

          // determine display name using available fields
          const name = it.inventoryItemName
            ? `${it.inventoryItemName}`
            : it.recipeName
            ? `Recipe: ${it.recipeName}`
            : `Item ${it.inventoryItemId ?? ""}`;

          const qty = it.quantity != null ? ` — ${it.quantity}` : "";
          const req = it.isRequested ? " (requested)" : "";

          return (
            <li key={it.transferItemId} className="d-flex align-items-center py-1">
              <div className="me-2" style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "#f1f1f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {src ? (
                  <img
                    src={src}
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/placeholder.png";
                    }}
                  />
                ) : (
                  // simple fallback visual
                  <span className="text-muted" style={{ fontSize: 10 }}>no image</span>
                )}
              </div>
              <div className="flex-grow-1">
                <span>{name}{qty}{req}</span>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      "No items"
    );

  // --------------------------------------------------
  // DETAIL / METADATA / ACTIONS PREPARATION
  // --------------------------------------------------
  const detail = {
    title: `ID ${transfer.transferId}: ${
      transfer.transferDate ? transfer.transferDate : ""
    } (${transfer.fromStoreName ?? ""} → ${transfer.toStoreName ?? ""})`,
    rows: [
      { label: "Requester", value: transfer.requesterName ?? transfer.requestedByName ?? '' },
      { label: "Requested From", value: transfer.fromStoreName ?? '' },
      { label: "Requested To", value: transfer.toStoreName ?? '' },
      { label: "Status", value: transfer.status ?? '' },
      { label: "Requested At", value: fmt(transfer.requestedAt) },
      { label: "Received At", value: fmt(transfer.recievedAt) },
      { label: "Requested By", value: transfer.requestedByName ?? '' },
      { label: "Approved By", value: transfer.approvedByName ?? '' },
      { label: "Driver Name", value: transfer.driverName ?? '' },
      { label: "Driver Email", value: transfer.driverEmail ?? '' },
      { label: "Notes", value: transfer.notes ?? '' },
      { label: "Items", value: itemsJsx },
    ],
  };

  const metadata = {
    title: "About This Transfer",
    rows: [
      { label: "Requested At", value: fmt(transfer.requestedAt) },
      { label: "Requested By", value: transfer.requestedByName ?? '' },
      { label: "Received At", value: fmt(transfer.recievedAt) },
    ],
  };

  // actions: simple back button
  const actions = [
    { icon: null, title: "Back", route: "/inventory/transfers" },
  ];

  // --------------------------------------------------
  // FINAL RENDER
  // --------------------------------------------------
  return (
    <DetailViewWithMetadata
      headerProps={headerProps}
      detail={detail}
      metadata={metadata}
      actions={actions}
    />
  );
};

export default InventoryTransferView;