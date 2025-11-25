import React, { useEffect, useMemo, useState } from 'react';

/*
  UsersList.jsx
  Simple user listing page with search, pagination and basic actions.
  Adjust API endpoints and routing to match the application.
*/

const DEFAULT_PAGE_SIZE = 10;

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchUsers() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      if (query.trim()) params.set('q', query.trim());

      try {
        const res = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        }

        const payload = await res.json();
        // Expect payload to have shape: { items: [], total: number }
        setUsers(Array.isArray(payload.items) ? payload.items : []);
        setTotal(typeof payload.total === 'number' ? payload.total : 0);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
    return () => controller.abort();
  }, [page, perPage, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  function handleSearchChange(e) {
    setQuery(e.target.value);
    setPage(1);
  }

  function handlePerPageChange(e) {
    setPerPage(Number(e.target.value) || DEFAULT_PAGE_SIZE);
    setPage(1);
  }

  function goToEdit(userId) {
    // Adjust navigation to match your router (this uses full navigation)
    window.location.href = `/users/${userId}/edit`;
  }

  async function handleDelete(userId) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(userId);

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      // Optimistic update
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      window.alert(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="users-list">
      <header className="users-list__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Users</h2>
        <div>
          <button type="button" onClick={() => (window.location.href = '/users/create')}>Create User</button>
        </div>
      </header>

      <div className="users-list__controls" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          aria-label="Search users"
          placeholder="Search by name or email..."
          value={query}
          onChange={handleSearchChange}
          style={{ padding: 8, minWidth: 240 }}
        />
        <label>
          Per page:
          <select value={perPage} onChange={handlePerPageChange} style={{ marginLeft: 8 }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div>Loading users...</div>
      ) : error ? (
        <div role="alert" style={{ color: 'red' }}>Error: {error}</div>
      ) : users.length === 0 ? (
        <div>No users found.</div>
      ) : (
        <table className="users-list__table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>ID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Email</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Role</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{user.id}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{user.name}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{user.email}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{user.role || 'User'}</td>
                <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>
                  <button type="button" onClick={() => goToEdit(user.id)} style={{ marginRight: 8 }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(user.id)} disabled={deletingId === user.id}>
                    {deletingId === user.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="users-list__pagination" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          Showing {(users.length === 0) ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
          <span style={{ alignSelf: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      </footer>
    </div>
  );
}