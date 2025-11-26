import React from 'react';

// Placeholder Stores list
// Static content only — no data fetching or logic to avoid runtime errors during navigation.
export default function StoresList() {
  return (
    <div className="stores-list container py-3">
      <h2>Stores</h2>
      <p className="text-muted">Static placeholder page for navigation. No backend calls or props required.</p>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Store ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Manager</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Main Store</td>
              <td>Headquarters</td>
              <td>Open</td>
              <td>—</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Outlet #1</td>
              <td>Downtown</td>
              <td>Closed</td>
              <td>—</td>
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