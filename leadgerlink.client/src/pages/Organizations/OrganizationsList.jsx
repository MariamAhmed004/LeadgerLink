import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/*
  OrganizationsList.jsx
  - Lists organizations with search, pagination and basic actions.
  - Uses fetch to call a REST endpoint at /api/organizations
  - Keeps UI simple so it integrates easily into existing app styles.
*/

function OrganizationsList() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrganizations = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    try {
      const res = await fetch(`/api/organizations?${params.toString()}`, { signal });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const json = await res.json();
      // Expecting shape: { items: [...], total: number }
      setItems(Array.isArray(json.items) ? json.items : []);
      setTotal(typeof json.total === 'number' ? json.total : 0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load organizations');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrganizations(controller.signal);
    return () => controller.abort();
  }, [fetchOrganizations]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    // fetchOrganizations will run due to dependency on query/page via useEffect
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this organization?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      // Refresh list after delete
      setItems(prev => prev.filter(i => i.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="organizations-list">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Organizations</h2>
        <div>
          <button type="button" onClick={() => navigate('/organizations/new')}>
            New Organization
          </button>
        </div>
      </header>

      <form onSubmit={onSearchSubmit} style={{ marginTop: 12, marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search organizations..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search organizations"
        />
        <button type="submit" disabled={loading}>Search</button>
        <button
          type="button"
          onClick={() => { setQuery(''); setPage(1); }}
          disabled={loading || !query}
        >
          Clear
        </button>
      </form>

      {loading && <div>Loading...</div>}
      {error && <div role="alert" style={{ color: 'crimson' }}>{error}</div>}

      {!loading && items.length === 0 && <div>No organizations found.</div>}

      {items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(org => (
              <tr key={org.id}>
                <td style={{ padding: '8px 4px' }}>
                  <Link to={`/organizations/${org.id}`}>{org.name || '—'}</Link>
                </td>
                <td style={{ padding: '8px 4px' }}>{org.status || 'Unknown'}</td>
                <td style={{ padding: '8px 4px' }}>
                  {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <Link to={`/organizations/${org.id}`} style={{ marginRight: 8 }}>View</Link>
                  <Link to={`/organizations/${org.id}/edit`} style={{ marginRight: 8 }}>Edit</Link>
                  <button type="button" onClick={() => onDelete(org.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          Page {page} of {totalPages} — {total} total
        </div>
        <div>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            style={{ marginLeft: 8 }}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}

export default OrganizationsList;