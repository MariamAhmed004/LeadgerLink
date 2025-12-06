import React, { useState, useEffect } from "react";
import { FaRegImage } from "react-icons/fa";

/*
  MenuTabCard
  - Select behavior:
    - Quantity is initialized to 0.
    - If quantity > 0 -> card considered selected (button shows "Selected").
    - If quantity returns to 0 -> card considered deselected (button shows "Select").
  - Prevents form submission by explicitly using type="button" on the Select control.
*/

const MenuTabCard = ({ data }) => {
  const {
    name,
    description,
    price,
    quantity = 0,         // available quantity (stock)
    onSelect,             // callback from TabbedMenu
    isSelected,           // selection state provided by TabbedMenu
    imageUrl
  } = data;

  // Selected quantity for this card (local state) — start at 0
  const [selectedQty, setSelectedQty] = useState(0);

  // Ensure that when the parent toggles selection off, qty stays consistent (optional: keep current qty)
  useEffect(() => {
    if (!isSelected && selectedQty > 0) {
      // If parent deselects, do not force reset qty; keep it as is
      // If you prefer resetting to 0 when deselected, uncomment:
      // setSelectedQty(0);
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtyChange = (e) => {
    let v = parseInt(e.target.value, 10);
    if (Number.isNaN(v)) v = 0;
    if (quantity && v > quantity) v = quantity;
    if (v < 0) v = 0;
    setSelectedQty(v);

    // Inform parent selection map:
    // - mark selected when v > 0
    // - mark deselected when v === 0
    if (typeof onSelect === "function") {
      onSelect(v);
    }
  };

  const handleSelectButton = () => {
    // toggle between selected/deselected state by qty:
    // - if currently 0, set to 1 (or min allowed) to select
    // - if > 0, set to 0 to deselect
    const nextQty = selectedQty > 0 ? 0 : Math.min(1, quantity || 1);
    setSelectedQty(nextQty);
    if (typeof onSelect === "function") {
      onSelect(nextQty);
    }
  };

  const selectedClass = isSelected || selectedQty > 0 ? "border-2 border-success shadow-sm" : "border border-light";
  const isOutOfStock = quantity === 0;

  return (
    <div
      className={`bg-white rounded-3 p-4 ${selectedClass}`}
      style={{ width: "100%" }}
    >
      <div className="row g-3" style={{ minHeight: 200 }}>
        {/* Left column: title above image */}
        <div className="col-12 col-md-5">
          <div className="d-flex flex-column h-100">
            <div className="mb-3 text-start">
              <div className="fst-italic text-dark" style={{ fontSize: "1.1rem", whiteSpace: "normal" }}>{name}</div>
            </div>

            <div className="flex-grow-1 d-flex align-items-center justify-content-center bg-light rounded-2 shadow-sm overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="img-fluid"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, maxHeight: 220 }}
                />
              ) : (
                <div className="p-4">
                  <FaRegImage size={56} className="text-muted" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: details */}
        <div className="col-12 col-md-7">
          <div className="d-flex flex-column h-100">
            <div className="mb-2 text-start">
              {description && <div className="text-muted small">{description}</div>}
            </div>

            <div className="mb-3 text-start">
              <span className="fw-semibold text-secondary">Selling Price:</span>{" "}
              <span className="text-dark">{price}</span>
            </div>

            <div className="mt-auto d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between">
              <div className="d-flex align-items-center mb-2 mb-md-0" style={{ minWidth: 0 }}>
                <span className="fw-semibold text-secondary me-2">Quantity:</span>
                <span className="me-3 text-muted">Available: {quantity}</span>

                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 96 }}
                  min={0}
                  max={quantity || undefined}
                  value={selectedQty}
                  onChange={handleQtyChange}
                  aria-label="Select quantity"
                  disabled={isOutOfStock}
                />
              </div>

              <div className="ms-0 ms-md-3 mt-2 mt-md-0 d-flex justify-content-start justify-content-md-end">
                <button
                  type="button"        
                  className={`btn btn-sm ${selectedQty > 0 ? "btn-success text-white" : "btn-outline-primary"}`}
                  onClick={handleSelectButton}
                  disabled={isOutOfStock}
                >
                  {selectedQty > 0 ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuTabCard;
