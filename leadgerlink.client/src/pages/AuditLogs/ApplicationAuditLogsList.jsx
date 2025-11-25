import React from 'react';

/**
 * Static template: ApplicationAuditLogsList
 * Renders a static table only (no data fetching or interactive controls).
 */

export default function ApplicationAuditLogsList() {
    return (
        <div className="application-auditlogs-list">
            <h2>Application Audit Logs</h2>

            <div className="controls" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                    type="search"
                    placeholder="Search (disabled in template)"
                    disabled
                    aria-label="Search audit logs (template)"
                    style={{ flex: 1 }}
                />

                <select disabled aria-label="Filter by action (template)">
                    <option>All actions</option>
                </select>

                <select disabled aria-label="Page size (template)">
                    <option>25</option>
                </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: 8 }}>Timestamp</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>User</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Resource</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ padding: 8, verticalAlign: 'top', whiteSpace: 'nowrap' }}>2025-01-01 09:00:00</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>system@domain.test</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>LOGIN</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>Auth</td>
                        <td style={{ padding: 8, verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>User signed in (template)</pre>
                        </td>
                    </tr>

                    <tr>
                        <td style={{ padding: 8, verticalAlign: 'top', whiteSpace: 'nowrap' }}>2025-01-01 09:05:00</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>alice@example.com</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>CREATE</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>Invoice</td>
                        <td style={{ padding: 8, verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>Created invoice #1234</pre>
                        </td>
                    </tr>

                    <tr>
                        <td style={{ padding: 8, verticalAlign: 'top', whiteSpace: 'nowrap' }}>2025-01-01 09:10:00</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>bob@example.com</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>UPDATE</td>
                        <td style={{ padding: 8, verticalAlign: 'top' }}>Product</td>
                        <td style={{ padding: 8, verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>Updated price to $9.99</pre>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div>
                    <button type="button" disabled>Previous</button>
                    <button type="button" disabled style={{ marginLeft: 8 }}>Next</button>
                </div>

                <div>
                    Page 1 of 1 — 3 items
                </div>
            </div>
        </div>
    );
}