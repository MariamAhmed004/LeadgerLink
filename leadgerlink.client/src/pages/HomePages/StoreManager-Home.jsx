import React from 'react';

// Placeholder Store Manager Home
// Static content only — no data fetching or logic to avoid runtime errors during navigation.
export default function StoreManagerHome() {
  return (
    <div className="store-manager-home container py-3">
      <h2>Store Manager Home</h2>
      <p className="text-muted">Static placeholder page for navigation. No backend calls required.</p>

      <div className="row g-3 my-3">
        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Today's Sales</h6>
              <div className="display-6">$0</div>
              <p className="mt-2 mb-0 text-muted">Placeholder metric</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Open Orders</h6>
              <div className="display-6">0</div>
              <p className="mt-2 mb-0 text-muted">Placeholder metric</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Inventory Alerts</h6>
              <div className="display-6">0</div>
              <p className="mt-2 mb-0 text-muted">Placeholder metric</p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Store</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Store</td>
              <td>Headquarters</td>
              <td>Open</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}