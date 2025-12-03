import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaExchangeAlt,
  FaShieldAlt,
  FaBell,
  FaTools,
  FaInfoCircle,
  FaBoxOpen,
  FaBug,
} from "react-icons/fa";

/*
  NotificationView
  - Fetches a single notification by id using repository-backed endpoint (GET /api/notifications/{id})
  - Displays icon beside subject, subject larger/bolder than message, left-aligned body
  - Allows marking the notification as read (POST /api/notifications/{id}/read)
  - Gracefully handles missing endpoint or errors
  - Uses same icon mapping/logic as NotificationItem
*/

const getIconByType = (type, size = 28) => {
  const t = (type || "").toLowerCase().trim();

  switch (t) {
    case "transfer":
    case "transfer_update":
    case "transfer request update":
    case "inventory transfer":
    case "inventory transfer update":
      return <FaExchangeAlt size={size} />;
    case "announcement":
    case "announcement_notice":
    case "announcement notice":
      return <FaBell size={size} />;
    case "low stock":
    case "low stock alert":
    case "low_stock_alert":
      return <FaBoxOpen size={size} />;
    case "security":
    case "security_alert":
    case "security alert":
      return <FaShieldAlt size={size} />;
    case "error":
    case "error found":
    case "exception":
    case "bug":
      return <FaBug size={size} />;
    case "maintenance":
    case "maintenance_notice":
    case "maintenance notice":
      return <FaTools size={size} />;
    default:
      return <FaInfoCircle size={size} />;
  }
};

export default function NotificationView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          // If endpoint not implemented server-side return 404 friendly message
          if (res.status === 404) {
            throw new Error("Notification not found.");
          }
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load notification (${res.status})`);
        }

        const dto = await res.json();

        // normalize DTO (server may return camelCase)
        const mapped = {
          id: dto.notificationId ?? dto.NotificationId ?? id,
          subject: dto.subject ?? dto.Subject ?? "",
          message: dto.message ?? dto.Message ?? "",
          date: dto.createdAt ?? dto.CreatedAt ?? null,
          read:
            typeof dto.isRead === "boolean"
              ? dto.isRead
              : dto.isRead ?? dto.IsRead ?? false,
          // prefer notificationTypeName; fall back to nested object
          type:
            dto.notificationTypeName ??
            dto.notificationType?.notificationTypeName ??
            dto.NotificationTypeName ??
            "",
        };

        if (mounted) setNotification(mapped);
      } catch (ex) {
        console.error(ex);
        if (mounted) setError(ex?.message || "Failed to load notification");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const markAsRead = async () => {
    if (!notification || notification.read) return;
    setSaving(true);
    setError("");
    const prev = notification;
    setNotification({ ...notification, read: true });
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
    } catch (ex) {
      console.error(ex);
      setNotification(prev);
      setError(ex?.message || "Failed to mark as read");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
              {/* Icon (uses same mapping as NotificationItem) */}
              <div style={{ lineHeight: 1, marginTop: 2 }}>
                {notification ? getIconByType(notification.type, 28) : <FaInfoCircle size={28} />}
              </div>

              <div style={{ minWidth: 0 }}>
                {/* Subject: larger and bolder than message, left aligned */}
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "Loading…" : notification?.subject ?? "Notification"}
                </h2>

                <div className="text-muted" style={{ fontSize: 13, marginTop: 4, textAlign: "left" }}>
                  {loading ? "" : notification?.date ? new Date(notification.date).toLocaleString() : ""}
                </div>
              </div>
            </div>

            <div className="text-end">
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate(-1)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void markAsRead()}
                disabled={saving || loading || (notification && notification.read)}
              >
                {saving ? "Saving..." : notification && notification.read ? "Read" : "Mark read"}
              </button>
            </div>
          </div>

          <hr />

          <section style={{ textAlign: "left" }}>
            {loading ? (
              <p>Loading content…</p>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : (
              <div style={{ fontSize: 15, color: "#333", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {notification?.message}
              </div>
            )}
          </section>

          <hr />

          {!loading && !error && notification && (
            <section className="small text-muted" style={{ textAlign: "left" }}>
              <div>Notification ID: {notification.id}</div>
              <div>Type: {notification.type || "—"}</div>
              <div>Read: {notification.read ? "Yes" : "No"}</div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}