import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBox, FaArrowLeft, FaEdit } from "react-icons/fa";
import DetailViewWithImage from "../Templates/DetailViewWithImage";

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
        const res = await fetch(`/api/inventoryitems/${id}`, { credentials: "include" });
        if (!res.ok) {
          // fallback to list endpoint (keeps previous behavior)
          if (res.status === 404) {
            const listRes = await fetch("/api/inventoryitems/list-for-current-store?page=1&pageSize=1000", { credentials: "include" }).catch(() => null);
            if (listRes && listRes.ok) {
              const json = await listRes.json();
              const found = (json.items || []).find((i) => String(firstDefined(i, "inventoryItemId", "id")) === String(id));
              if (mounted) {
                if (found) setItem(found);
                else setError(`Item ${id} not found.`);
              }
              return;
            }
          }
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

  const idVal = item ? firstDefined(item, "inventoryItemId", "id") ?? id : id;
  const nameVal = item ? firstDefined(item, "inventoryItemName", "inventoryItemName", "name") || "" : "";
  const tsVal = item ? firstDefined(item, "createdAt", "CreatedAt", "timestamp", "Timestamp") : null;

  // compute stock level if backend didn't provide or client needs to
  const qty = item?.quantity != null ? Number(item.quantity) : null;
  const minQty = item?.minimumQuantity != null ? Number(item.minimumQuantity) : null;
  const stockLevel =
    qty == null
      ? (item?.stockLevel ?? "")
      : qty <= 0
      ? "Out of Stock"
      : minQty != null && qty < minQty
      ? "Low Stock"
      : "In Stock";

  const headerProps = {
    icon: <FaBox size={28} />,
    title: item ? `Inventory Item` : "Inventory Item",
    descriptionLines: item
      ? [
          firstDefined(item, "categoryName", "CategoryName", "category") || "",
          firstDefined(item, "supplierName", "SupplierName", "supplier") || ""
        ]
      : ["Inventory item details"],
    actions: []
  };

  // Build detail rows: include all relevant fields except created/createdAt/updatedAt (these go to metadata)
  const detailRows = item
    ? [
        { label: "Item Name", value: firstDefined(item, "inventoryItemName", "InventoryItemName", "name") || "" },
        { label: "Category", value: firstDefined(item, "categoryName", "CategoryName") || "" },
        { label: "Supplier", value: firstDefined(item, "supplierName", "SupplierName") || "" },
        { label: "Store", value: firstDefined(item, "storeName", "StoreName") || firstDefined(item, "storeId") || "" },
        { label: "Unit", value: firstDefined(item, "unitName", "UnitName") || "" },
        { label: "Quantity", value: item.quantity != null ? Number(item.quantity).toFixed(3) : "" },
        { label: "Minimum Quantity", value: item.minimumQuantity != null ? Number(item.minimumQuantity).toFixed(3) : "" },
        { label: "Stock Level", value: stockLevel || (item.stockLevel ?? "") },
        { label: "Cost per Unit", value: formatMoney(firstDefined(item, "costPerUnit", "CostPerUnit")) },
        { label: "Description", value: firstDefined(item, "description", "Description") || "" },
        { label: "Related Products", value: firstDefined(item, "relatedProductsCount", "RelatedProductsCount") ?? firstDefined(item, "relatedProducts", "products") ? (item.relatedProducts?.length ?? item.products?.length ?? "") : "" },
      ]
    : [];

  // metadata under image: keep exactly Created By / Created At / Updated At
  const metadataUnderImage = item
    ? {
        title: "Summary",
        rows: [
          { label: "Created By", value: firstDefined(item, "createdByName", "CreatedByName", "createdBy") || "" },
          { label: "Created At", value: formatDateTime(firstDefined(item, "createdAt", "CreatedAt", "CreatedAtUtc", "timestamp", "Timestamp")) },
          { label: "Updated At", value: formatDateTime(firstDefined(item, "updatedAt", "UpdatedAt", "modifiedAt", "ModifiedAt")) },
        ]
      }
    : { title: "Summary", rows: [] };

  const image = {
    // server now returns ImageDataUrl when binary image stored; prefer that
    url: firstDefined(item, "imageDataUrl", "ImageDataUrl", "imageDataUrl") || firstDefined(item, "imageUrl", "ImageUrl", "imagePath") || "",
    alt: nameVal || `Item ${idVal}`
  };

  const actions = [
    { icon: <FaArrowLeft />, title: "Back to Items", onClick: () => navigate("/inventory") },
    { icon: <FaEdit />, title: "Edit Item", route: `/inventory/new?edit=${idVal}` }
  ];

  return (
    <DetailViewWithImage
      headerProps={headerProps}
      // detail.title formatted per latest request: "(inventory item#id inventoryname)"
      detail={{ title: item ? `inventory item#${idVal} ${nameVal}` : "Item Details", rows: detailRows }}
      image={image}
      metadataUnderImage={metadataUnderImage}
      actions={actions}
    />
  );
}