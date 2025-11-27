import React from "react";
import { Link } from "react-router-dom";

const InventoryNew = () => {
  return (
    <div className="container py-5">
      <h1 className="display-6">Add Inventory Item (Placeholder)</h1>
      <p className="text-muted">
        This is a static placeholder page for adding a new inventory item. The real form will be implemented later.
      </p>
      <Link to="/inventory" className="btn btn-outline-primary mt-3">
        Back to Inventory
      </Link>
    </div>
  );
};

export default InventoryNew;