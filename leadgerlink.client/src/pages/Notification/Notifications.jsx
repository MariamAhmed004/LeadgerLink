import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/Form/InputField";
import NotificationItem from "./NotificationItem";

/*
  Notifications page - fetches overview for the logged-in user using the
  repository-backed endpoint implemented server-side at:
    GET /api/notifications/latest?pageSize=...
  Mapping uses the server DTO field names exactly:
    - notificationId
    - subject
    - message
    - createdAt
    - isRead
    - notificationType.notificationTypeName
*/

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // filter UI state
  const [search, setSearch] = useState("");
  const [filterRead, setFilterRead] = useState("all"); // all | read | unread
  const [filterDate, setFilterDate] = useState("");

  const fetchNotifications = useCallback(async (pageSize = 10) => {
    setLoading(true);
    setError(null);
    try {
      // Use repository-backed controller endpoint that returns domain Notification DTOs
      const res = await fetch(`/api/notifications/latest?pageSize=${encodeURIComponent(pageSize)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      // Map server DTO fields (use exact field names returned by server)
      const mapped = (Array.isArray(data) ? data : []).map((n) => ({
        id: n.notificationId, // server field
        title: n.subject,
        message: n.message,
        date: n.createdAt,
        read: n.isRead,
        type: n.notificationType ? n.notificationType.notificationTypeName : "",
        // keep original raw for debugging if needed
        _raw: n,
      }));
      setNotifications(mapped);
    } catch (err) {
      setError(err?.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications(10);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    setSaving(true);
    setError(null);
    const prev = notifications;
    setNotifications((n) => n.map((it) => (it.id === id ? { ...it, read: true } : it)));
    try {
      // Controller endpoint expected to call repository.MarkAsReadAsync server-side
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
    } catch (err) {
      setNotifications(prev);
      setError(err?.message || "Failed to mark notification as read");
    } finally {
      setSaving(false);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications.length) return;
    setSaving(true);
    setError(null);
    const prev = notifications;
    setNotifications((n) => n.map((it) => ({ ...it, read: true })));
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
    } catch (err) {
      setNotifications(prev);
      setError(err?.message || "Failed to mark all as read");
    } finally {
      setSaving(false);
    }
  };

  // client-side filtering (operates on mapped fields above)
  const filtered = notifications.filter((n) => {
    if (filterRead === "read" && !n.read) return false;
    if (filterRead === "unread" && n.read) return false;
    if (filterDate) {
      const d = n.date ? new Date(n.date).toISOString().slice(0, 10) : "";
      if (d !== filterDate) return false;
    }
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      return (n.title || "").toLowerCase().includes(s) || (n.message || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <main aria-labelledby="notifications-heading" style={{ padding: 20 }}>
      <div className="card shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
        {/* header */}
        <div style={{ background: "#2f5f8a", padding: 18 }}>
          <h1 id="notifications-heading" style={{ color: "#fff", margin: 0, textAlign: "center", fontStyle: "italic" }}>
            System Notifications
          </h1>
        </div>

        {/*
          Use an overflow wrapper to allow horizontal scrolling when viewport is narrow.
          Inner container uses inline-flex so children keep their widths and cause horizontal scroll
          rather than collapsing and cutting off content.
        */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "inline-flex", gap: 24, padding: 20, width: "100%", alignItems: "flex-start" }}>
            {/* Main list */}
            <div style={{ flex: "1 1 auto", minWidth: 320, maxWidth: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <button
                    type="button"
                    onClick={() => void fetchNotifications(10)}
                    disabled={loading || saving}
                    className="btn btn-outline-secondary me-2"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => void markAllAsRead()}
                    disabled={saving || notifications.length === 0}
                    className="btn btn-outline-secondary"
                  >
                    Mark all read
                  </button>
                </div>
              </div>

              {loading && <p>Loading notifications…</p>}
              {error && (
                <div role="alert" style={{ color: "var(--danger, #c00)" }}>
                  <p>Unable to load notifications: {error}</p>
                  <button type="button" onClick={() => void fetchNotifications(10)}>Retry</button>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && <p>No notifications</p>}

              {!loading && !error && filtered.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {filtered.map((n) => (
                    <NotificationItem key={n.id} item={n} onMarkRead={markAsRead} />
                  ))}
                </ul>
              )}
            </div>

            {/* Right-side filters */}
            <aside
              className="mt-5 border rounded p-3"
              style={{ flex: "0 0 300px", width: 300 }}
            >
              <div style={{ marginBottom: 12 }}>
                <InputField
                  label={null}
                  value={search}
                  onChange={setSearch}
                  placeholder="Search notifications..."
                  className="mb-2"
                />
              </div>

              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Filter By:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`btn ${filterRead === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setFilterRead("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterRead === "read" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setFilterRead("read")}
                  >
                    Read
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterRead === "unread" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setFilterRead("unread")}
                  >
                    Unread
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>Date</label>
                <InputField label={null} type="date" value={filterDate} onChange={setFilterDate} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}