import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import DetailViewWithImage from "../Templates/DetailViewWithImage";
import { MdOutlineInventory } from "react-icons/md";

/*
  InventoryItemView.jsx
  Summary:
  - Displays details for a single inventory item. Fetches the item by id from
    GET /api/inventoryitems/{id}, formats values for display and renders a
    DetailViewWithImage component including metadata and actions.
*/

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
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

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function InventoryItemView() {
  // route/nav helpers
  const { id } = useParams();
  const navigate = useNavigate();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  // loaded item DTO
  const [item, setItem] = useState(null);
  // loading / error flags for fetch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // EFFECT: fetch item on mount / id change
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/inventoryitems/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load item ${id} (status ${res.status})`);
        }
        const json = await res.json();
        if (mounted) setItem(json);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load item");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------------------------------
  // DATA PROCESSING: derive display values and stock level
  // --------------------------------------------------
  // resilient id and name extraction from DTO
  const idVal = item?.inventoryItemId ?? id;
  const nameVal = item?.inventoryItemName ?? "";

  // numeric quantities normalized for display/logic
  const qty = item?.quantity != null ? Number(item.quantity) : null;
  const minQty = item?.minimumQuantity != null ? Number(item.minimumQuantity) : null;

  // compute stock level label using available quantity and minimum threshold
  const stockLevel = item?.stockLevel ?? (
    qty == null
      ? ""
      : qty <= 0
      ? "Out of Stock"
      : minQty != null && qty < minQty
      ? "Low Stock"
      : "In Stock"
  );

  // --------------------------------------------------
  // HEADER / METADATA PREPARATION
  // --------------------------------------------------
  const headerProps = {
    icon: <MdOutlineInventory size={55} />,
    title: "Inventory Item",
    descriptionLines: item ? [item.categoryName ?? "", item.supplierName ?? ""] : ["Inventory item details"],
    actions: []
  };

  // --------------------------------------------------
  // RENDER: loading / error / not found handling
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="container py-5">
        <div className="alert alert-info text-start mb-3" role="alert">
          Loading item details... Please wait.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DetailViewWithImage
        headerProps={headerProps}
        detail={{ title: "Error", rows: [{ label: "Message", value: error }] }}
        metadataUnderImage={{ title: "", rows: [] }}
        actions={[]}
      />
    );
  }

  if (!item) {
    return (
      <DetailViewWithImage
        headerProps={headerProps}
        detail={{ title: "Not found", rows: [] }}
        metadataUnderImage={{ title: "", rows: [] }}
        actions={[]}
      />
    );
  }

  // --------------------------------------------------
  // DETAIL / METADATA / ACTIONS
  // --------------------------------------------------
  // rows for primary detail area
  const detailRows = [
    { label: "Item Name", value: item.inventoryItemName ?? "" },
    { label: "Category", value: item.categoryName ?? "" },
    { label: "Supplier", value: item.supplierName ?? "" },
    { label: "Store", value: item.storeName ?? String(item.storeId ?? "") },
    { label: "Unit", value: item.unitName ?? "" },
    { label: "Quantity", value: item.quantity != null ? Number(item.quantity).toFixed(3) : "" },
    { label: "Minimum Quantity", value: item.minimumQuantity != null ? Number(item.minimumQuantity).toFixed(3) : "" },
    { label: "Stock Level", value: stockLevel },
    { label: "Cost per Unit", value: formatMoney(item.costPerUnit) },
    { label: "Description", value: item.description ?? "" },
    {
      label: "Related Product",
      value:
        item.relatedProductId != null
          ? (<a href={`/products/${item.relatedProductId}`} className="text-decoration-underline">Product#{item.relatedProductId}</a>)
          : "Not On Sale"
    },
  ];

  // metadata shown next to the image
  const metadataUnderImage = {
    title: "Summary",
    rows: [
      { label: "Created By", value: item.createdByName ?? "" },
      { label: "Created At", value: formatDateTime(item.createdAt) },
      { label: "Updated At", value: formatDateTime(item.updatedAt) },
    ]
  };

  // image object passed to the template
  const image = {
    url: item.imageDataUrl || "",
    alt: nameVal || `Item ${idVal}`
  };

  // action buttons: back and edit
  const actions = [
    { icon: <FaArrowLeft />, title: "Back to Items", onClick: () => navigate("/inventory") },
    { icon: <FaEdit />, title: "Edit Item", route: `/inventory-items/edit/${idVal}` }
  ];

  // --------------------------------------------------
  // FINAL RENDER: detail view with image and metadata
  // --------------------------------------------------
  return (
    <DetailViewWithImage
      headerProps={headerProps}
      detail={{ title: `inventory item#${idVal} ${nameVal}`, rows: detailRows }}
      image={image}
      metadataUnderImage={metadataUnderImage}
      actions={actions}
    />
  );
}