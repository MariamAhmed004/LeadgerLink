import React from 'react';

// Placeholder Application Admin Home
// Static content only — no data fetching or logic to avoid runtime errors during navigation.
export default function ApplicationAdminHome() {
    return (
        <div className="application-admin-home container py-3">
            <h2>Application Admin Home</h2>
            <p className="text-muted">Placeholder page to satisfy navigation routes. No backend calls or props required.</p>

            <div className="row g-3 my-3">
                <div className="col-12 col-md-4">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted">Organizations</h6>
                            <div className="display-6">0</div>
                            <p className="mt-2 mb-0 text-muted">Manage organizations in the real implementation.</p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted">Users</h6>
                            <div className="display-6">0</div>
                            <p className="mt-2 mb-0 text-muted">User management will be available here.</p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted">Audit Logs</h6>
                            <div className="display-6">0</div>
                            <p className="mt-2 mb-0 text-muted">View application audit logs in the full app.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-responsive mt-3">
                <table className="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Description</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sample Organization</td>
                            <td>Placeholder entry</td>
                            <td>—</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}