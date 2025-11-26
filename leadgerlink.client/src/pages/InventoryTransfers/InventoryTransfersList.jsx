import React from 'react';

// Placeholder Inventory Transfers list
// Static content only — no data fetching or logic.
export default function InventoryTransfersList() {
  return (
    <div className="inventory-transfers-list container py-3">
      <h2>Inventory Transfers</h2>
      <p className="text-muted">This is a placeholder page used for navigation. No backend calls or props required.</p>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>From Store</th>
              <th>To Store</th>
              <th>Items</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TR-0001</td>
              <td>Main Store</td>
              <td>Outlet #1</td>
              <td>3</td>
              <td>Pending</td>
              <td>2025-01-01</td>
            </tr>
            <tr>
              <td>TR-0002</td>
              <td>Warehouse</td>
              <td>Main Store</td>
              <td>12</td>
              <td>Completed</td>
              <td>2025-01-02</td>
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