import React, { useState, useEffect } from "react";
import { FaRegImage } from "react-icons/fa";

const MenuTabCard = ({ data }) => {
  const {
    name,
    description,
    price,
    quantity = 0,         // available quantity (stock)
    onSelect,             // callback from TabbedMenu
    isSelected,           // selection state provided by TabbedMenu
    imageUrl,
    initialSelectedQty = 0,
    enforceAvailability = true, // NEW: when true, cap selected qty to 'quantity' and set input max
  } = data;

  const [selectedQty, setSelectedQty] = useState(0);

  useEffect(() => {
    const v = Number(initialSelectedQty || 0);
    if (Number.isFinite(v) && v > 0) {
      setSelectedQty(v);
      if (typeof onSelect === "function") onSelect(v);
    }
  }, [initialSelectedQty]);

  useEffect(() => {
    if (!isSelected && selectedQty > 0) {
      // keep qty as-is when deselected (design choice)
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtyChange = (e) => {
    let v = parseInt(e.target.value, 10);
    if (Number.isNaN(v)) v = 0;
    if (v < 0) v = 0;

    // Only clamp to available when enforceAvailability is true
    if (enforceAvailability && quantity && v > quantity) v = quantity;

    setSelectedQty(v);
    if (typeof onSelect === "function") {
      onSelect(v);
    }
  };

  const handleSelectButton = () => {
    // Select toggles to 1, but clamp only if enforceAvailability
    const minAllowed = enforceAvailability ? Math.min(1, quantity || 1) : 1;
    const nextQty = selectedQty > 0 ? 0 : minAllowed;
    setSelectedQty(nextQty);
    if (typeof onSelect === "function") {
      onSelect(nextQty);
    }
  };

  const selectedClass = isSelected || selectedQty > 0 ? "border-2 border-success shadow-sm" : "border border-light";
  const isOutOfStock = enforceAvailability ? quantity === 0 : false;

  const [imgSrc, setImgSrc] = useState(imageUrl || "");
  const [imgFailed, setImgFailed] = useState(!imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl || "");
    setImgFailed(!imageUrl);
  }, [imageUrl]);

  const handleImgError = () => setImgFailed(true);

  return (
    <div className={`bg-white rounded-3 p-4 ${selectedClass}`} style={{ width: "100%" }}>
      <div className="row g-3" style={{ minHeight: 200 }}>
        <div className="col-12 col-md-5">
          <div className="d-flex flex-column h-100">
            <div className="mb-3 text-start">
              <div className="fst-italic text-dark" style={{ fontSize: "1.1rem", whiteSpace: "normal" }}>{name}</div>
            </div>
            <div className="flex-grow-1 d-flex align-items-center justify-content-center bg-light rounded-2 shadow-sm overflow-hidden">
              {!imgFailed && imgSrc ? (
                <img
                  src={imgSrc}
                  alt={name}
                  className="img-fluid"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, maxHeight: 220 }}
                  onError={handleImgError}
                />
              ) : (
                <div className="p-4">
                  <FaRegImage size={56} className="text-muted" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-7">
          <div className="d-flex flex-column h-100">
            <div className="mb-2 text-start mt-4">
              {description && <div className="text-muted small">{description}</div>}
            </div>

            <div className="mb-3 text-start">
              <span className="fw-semibold text-secondary">Selling Price:</span>{" "}
              <span className="text-dark">{price}</span>
            </div>

            <div className="mt-auto d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between">
              <div className="d-flex align-items-center mb-2 mb-md-0" style={{ minWidth: 0 }}>
                <span className="fw-semibold text-secondary me-2">Available: </span>
                <span className="me-3 text-muted">{quantity}</span>
                <span className="fw-semibold text-secondary me-2">Quantity: </span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 75 }}
                  min={0}
                  // Only enforce max when enforceAvailability is true
                  max={enforceAvailability ? (quantity || undefined) : undefined}
                  value={selectedQty}
                  onChange={handleQtyChange}
                  aria-label="Select quantity"
                  disabled={enforceAvailability ? isOutOfStock : false}
                />
              </div>

              <div className="ms-0 ms-md-3 mt-2 mt-md-0 d-flex justify-content-start justify-content-md-end">
                <button
                  type="button"
                  className={`btn btn-sm ${selectedQty > 0 ? "btn-success text-white" : "btn-outline-primary"}`}
                  onClick={handleSelectButton}
                  disabled={enforceAvailability ? isOutOfStock : false}
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
