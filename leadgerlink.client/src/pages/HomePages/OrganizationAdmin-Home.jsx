import React from 'react';

// Placeholder Organization Admin Home
// Static content only — no data fetching or logic to avoid runtime errors during navigation.
export default function OrganizationAdminHome() {
  return (
    <div className="organization-admin-home container py-3">
      <h2>Organization Admin Home</h2>
      <p className="text-muted">Placeholder page to satisfy navigation routes. No backend calls or props required.</p>

      <div className="row g-3 my-3">
        <div className="col-12 col-md-6">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Organization Settings</h6>
              <div className="display-6">—</div>
              <p className="mt-2 mb-0 text-muted">Manage organization settings in the full app.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Members</h6>
              <div className="display-6">—</div>
              <p className="mt-2 mb-0 text-muted">User and role management will be available here.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Area</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sample Entry</td>
              <td>Placeholder content for navigation.</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}