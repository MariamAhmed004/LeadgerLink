import React from 'react';

// Placeholder Store Manager Dashboard
// Static content only — no data fetching or component state to avoid runtime errors.
export default function StoreManagerDashboard() {
  return (
    <div className="store-manager-dashboard container py-3">
      <h2>Store Manager Dashboard</h2>
      <p className="text-muted">This is a static placeholder page for navigation routes. No backend calls or props are required.</p>

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Total Sales</h6>
              <div className="display-6">$0</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Transactions</h6>
              <div className="display-6">0</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Avg Ticket</h6>
              <div className="display-6">$0.00</div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-4">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Store</th>
              <th>Status</th>
              <th>Last Order</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Store</td>
              <td>Open</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">Inventory Alerts</h6>
            <p className="mb-0 text-muted">No alerts (placeholder).</p>
          </div>
        </div>
      </div>
    </div>
  );
}