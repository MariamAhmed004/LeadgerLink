import React, { useEffect, useState, useCallback } from 'react';

/**
 * Notifications page
 *
 * Simple, accessible notifications list with:
 * - fetch from /api/notifications
 * - mark individual notifications as read
 * - mark all as read
 * - basic optimistic updates and error handling
 *
 * Adjust endpoints to match backend API.
 */

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(id) {
    setSaving(true);
    setError(null);

    // optimistic update
    const prev = notifications;
    setNotifications((n) => n.map((it) => (it.id === id ? { ...it, read: true } : it)));

    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
    } catch (err) {
      // rollback on error
      setNotifications(prev);
      setError(err.message || 'Failed to mark notification as read');
    } finally {
      setSaving(false);
    }
  }

  async function markAllAsRead() {
    if (!notifications.length) return;
    setSaving(true);
    setError(null);

    const prev = notifications;
    setNotifications((n) => n.map((it) => ({ ...it, read: true })));

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
    } catch (err) {
      setNotifications(prev);
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setSaving(false);
    }
  }

  function renderList() {
    if (loading) {
      return <p>Loading notifications…</p>;
    }

    if (error) {
      return (
        <div role="alert" aria-live="polite" style={{ color: 'var(--danger, #c00)' }}>
          <p>Unable to load notifications: {error}</p>
          <button type="button" onClick={() => void fetchNotifications()}>
            Retry
          </button>
        </div>
      );
    }

    if (!notifications.length) {
      return <p>No notifications</p>;
    }

    return (
      <ul aria-live="polite" className="notifications-list" style={{ listStyle: 'none', padding: 0 }}>
        {notifications.map((n) => (
          <li
            key={n.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '6px',
              background: n.read ? 'transparent' : 'var(--accent-bg, #eef6ff)',
              border: '1px solid var(--muted-border, #e0e0e0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
            aria-current={n.read ? undefined : 'true'}
          >
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{n.title}</strong>
              <div style={{ fontSize: '0.95rem', color: 'var(--muted-text, #555)' }}>{n.message}</div>
              <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted-text, #777)' }}>
                {n.date ? new Date(n.date).toLocaleString() : null}
              </div>
            </div>
            <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => void markAsRead(n.id)}
                  disabled={saving}
                  aria-label={`Mark notification "${n.title}" as read`}
                >
                  Mark read
                </button>
              )}
              {n.link && (
                <a href={n.link} onClick={() => {}} style={{ textDecoration: 'none' }}>
                  View
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main aria-labelledby="notifications-heading" style={{ padding: '20px', maxWidth: '880px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 id="notifications-heading">Notifications</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => void fetchNotifications()} disabled={loading || saving}>
            Refresh
          </button>
          <button type="button" onClick={() => void markAllAsRead()} disabled={saving || notifications.length === 0}>
            Mark all read
          </button>
        </div>
      </header>

      {renderList()}
    </main>
  );
}