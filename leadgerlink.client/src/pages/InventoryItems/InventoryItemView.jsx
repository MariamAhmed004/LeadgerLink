import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import DetailViewWithImage from "../Templates/DetailViewWithImage";
import { MdOutlineInventory } from "react-icons/md";

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

export default function InventoryItemView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const idVal = item?.inventoryItemId ?? id;
  const nameVal = item?.inventoryItemName ?? "";
  const qty = item?.quantity != null ? Number(item.quantity) : null;
  const minQty = item?.minimumQuantity != null ? Number(item.minimumQuantity) : null;
  const stockLevel = item?.stockLevel ?? (
    qty == null
      ? ""
      : qty <= 0
      ? "Out of Stock"
      : minQty != null && qty < minQty
      ? "Low Stock"
      : "In Stock"
  );

  const headerProps = {
    icon: <MdOutlineInventory size={55} />,
    title: "Inventory Item",
    descriptionLines: item ? [item.categoryName ?? "", item.supplierName ?? ""] : ["Inventory item details"],
    actions: []
  };

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

  const metadataUnderImage = {
    title: "Summary",
    rows: [
      { label: "Created By", value: item.createdByName ?? "" },
      { label: "Created At", value: formatDateTime(item.createdAt) },
      { label: "Updated At", value: formatDateTime(item.updatedAt) },
    ]
  };

  const image = {
    url: item.imageDataUrl || "",
    alt: nameVal || `Item ${idVal}`
  };

  const actions = [
    { icon: <FaArrowLeft />, title: "Back to Items", onClick: () => navigate("/inventory") },
    { icon: <FaEdit />, title: "Edit Item", route: `/inventory-items/edit/${idVal}` }
  ];

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