import React from 'react';

// Placeholder Organization Accountant Home
// Static content only — no data fetching or logic to avoid runtime errors during navigation.
export default function OrganizationAccountantHome() {
  return (
    <div className="organization-accountant-home container py-3">
      <h2>Organization Accountant Home</h2>
      <p className="text-muted">Static placeholder page for navigation. No backend calls required.</p>

      <div className="row g-3 my-3">
        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Ledgers</h6>
              <div className="display-6">—</div>
              <p className="mt-2 mb-0 text-muted">Ledger summaries will appear here in the real app.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Invoices</h6>
              <div className="display-6">—</div>
              <p className="mt-2 mb-0 text-muted">Invoice management will be available in production.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Reports</h6>
              <div className="display-6">—</div>
              <p className="mt-2 mb-0 text-muted">Financial reports placeholder.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Report</th>
              <th>Period</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sample Financial Report</td>
              <td>2025-Q1</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}