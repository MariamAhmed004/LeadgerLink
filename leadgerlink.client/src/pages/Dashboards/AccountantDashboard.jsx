import React from 'react';

// Placeholder page for Organization Accountant Dashboard
// Static content only — no data or logic to avoid runtime errors during navigation.
export default function AccountantDashboard() {
  return (
    <div className="accountant-dashboard container py-3">
      <h2>Accountant Dashboard</h2>
      <p className="text-muted">Placeholder page to satisfy navigation routes. No backend calls or props required.</p>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Financial Summary</h5>
              <p className="card-text">Summary metrics will be shown here in the real implementation.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Recent Reports</h5>
              <p className="card-text">Recent reports will appear here. This is static placeholder content.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-4">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Report</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monthly P&L</td>
              <td>2025-01-01</td>
              <td>Draft</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}