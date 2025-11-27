import React from "react";
import { Link } from "react-router-dom";

const SalesNew = () => {
  return (
    <div className="container py-5">
      <h1 className="display-6">Create Sale (Placeholder)</h1>
      <p className="text-muted">
        This is a static placeholder page for the Create Sale workflow. The real form will be implemented later.
      </p>
      <Link to="/sales" className="btn btn-outline-primary mt-3">
        Back to Sales
      </Link>
    </div>
  );
};

export default SalesNew;