import React from "react";

/*
  MenuTabCard
  - data may contain: name, description, price, quantity, onSelect, isSelected, imageUrl
  - card uses white background, border, rounded corners and supports an optional image on the left
  - designed to be used inside TabbedMenu's responsive grid
*/

const MenuTabCard = ({ data }) => {
  const { name, description, price, quantity, onSelect, isSelected, imageUrl } = data;

  return (
    <div
      className={`d-flex h-100 bg-white border rounded p-3 ${isSelected ? "border-success" : "border-light"}`}
      style={{ alignItems: "stretch" }}
    >
      {imageUrl && (
        <div className="me-3 d-flex align-items-center">
          <img
            src={imageUrl}
            alt={name}
            style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 8 }}
            className="shadow-sm"
          />
        </div>
      )}

      <div className="flex-grow-1 d-flex flex-column">
        <div className="mb-2">
          <div className="fw-bold fs-5 text-dark">{name}</div>
          {description && <div className="text-muted small">{description}</div>}
        </div>

        <div className="mb-2">
          <span className="fw-semibold text-secondary">Selling Price:</span>{" "}
          <span className="text-dark">{price}</span>
        </div>

        <div className="mt-auto d-flex align-items-center justify-content-between">
          <span className="fw-semibold text-secondary">Quantity: {quantity}</span>
          <button className="btn btn-outline-primary btn-sm" onClick={onSelect}>
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuTabCard;
