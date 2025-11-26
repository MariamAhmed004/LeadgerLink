import React from 'react';

// Placeholder Products list
// Static content only — no data fetching or logic.
export default function ProductsList() {
  return (
    <div className="products-list container py-3">
      <h2>Products</h2>
      <p className="text-muted">Static placeholder page for navigation. No backend calls or props required.</p>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Inventory</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Sample Product A</td>
              <td>SPA-001</td>
              <td>$0.00</td>
              <td>0</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Sample Product B</td>
              <td>SPB-002</td>
              <td>$0.00</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">Page 1 of 1 — 2 items</small>
        <div>
          <button className="btn btn-sm btn-secondary me-2" disabled>Previous</button>
          <button className="btn btn-sm btn-secondary" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}