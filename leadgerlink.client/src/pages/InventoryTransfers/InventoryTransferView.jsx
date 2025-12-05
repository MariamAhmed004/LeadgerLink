import React, { useEffect, useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";

const InventoryTransferView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transfer, setTransfer] = useState(null);

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

  // helper to format datetimes safely
  const fmt = (val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {}
    // fallback: return raw string
    return String(val);
  };

  const headerProps = {
    icon: <FaExchangeAlt size={45} />,
    title: transfer ? `Transfer ${transfer.transferId}` : "View Transfer",
    descriptionLines: [],
  };

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

  // Build items list JSX
  const itemsJsx =
    transfer.items && transfer.items.length ? (
      <ul style={{ margin: 0, paddingLeft: "1rem" }}>
        {transfer.items.map((it) => (
          <li key={it.transferItemId}>
            {it.inventoryItemName
              ? `${it.inventoryItemName}`
              : it.recipeName
              ? `Recipe: ${it.recipeName}`
              : `Item ${it.inventoryItemId ?? ""}`}
            {it.quantity != null ? ` — ${it.quantity}` : ""}
            {it.isRequested ? " (requested)" : ""}
          </li>
        ))}
      </ul>
    ) : (
      "No items"
    );

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