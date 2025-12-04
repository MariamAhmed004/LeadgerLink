import React, { useState } from "react";
import { FaRegImage } from "react-icons/fa";

/*
  MenuTabCard
  - Layout:
    - Uses Bootstrap grid so left column (title + image) is col-md-5 (~41.6%) and right column col-md-7 (~58.4%).
    - On small screens both columns are full width (col-12) and stack vertically.
    - Images are responsive and won't force horizontal scroll.
*/

const MenuTabCard = ({ data }) => {
  const { name, description, price, quantity = 0, onSelect, isSelected, imageUrl } = data;
  const [selectedQty, setSelectedQty] = useState(1);

  const handleQtyChange = (e) => {
    let v = parseInt(e.target.value, 10);
    if (Number.isNaN(v)) v = 1;
    if (quantity && v > quantity) v = quantity;
    if (v < 1) v = 1;
    setSelectedQty(v);
  };

  const handleSelect = () => {
    if (typeof onSelect === "function") {
      onSelect(selectedQty);
    }
  };

  return (
    <div
      className={`bg-white rounded-3 p-4 ${isSelected ? "border-2 border-success shadow-sm" : "border border-light"}`}
      style={{ width: "100%" }}
    >
      <div className="row g-3" style={{ minHeight: 200 }}>
        {/* Left column: title above image — ~40% on md+ via col-md-5 */}
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

        {/* Right column: details — remaining width via col-md-7 */}
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
                  min={1}
                  max={quantity || undefined}
                  value={selectedQty}
                  onChange={handleQtyChange}
                  aria-label="Select quantity"
                />
              </div>

              <div className="ms-0 ms-md-3 mt-2 mt-md-0 d-flex justify-content-start justify-content-md-end">
                <button
                  className={`btn btn-sm ${isSelected ? "btn-success text-white" : "btn-outline-primary"}`}
                  onClick={handleSelect}
                  disabled={quantity === 0}
                >
                  {isSelected ? "Selected" : "Select"}
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
