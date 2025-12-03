import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaExchangeAlt,
  FaShieldAlt,
  FaBell,
  FaTools,
  FaInfoCircle,
  FaBoxOpen,
  FaBug,
} from "react-icons/fa";

const getIconByType = (type) => {
  const t = (type || "").toLowerCase().trim();

  switch (t) {
    // transfer related
    case "transfer":
    case "transfer_update":
    case "transfer request update":
    case "inventory transfer":
    case "inventory transfer update":
      return <FaExchangeAlt size={22} />;

    // announcement / general notifications
    case "announcement":
    case "announcement_notice":
    case "announcement notice":
      return <FaBell size={22} />;

    // low stock / inventory warning
    case "low stock":
    case "low stock alert":
    case "low_stock_alert":
      return <FaBoxOpen size={22} />;

    // security alerts
    case "security":
    case "security_alert":
    case "security alert":
      return <FaShieldAlt size={22} />;

    // errors / exceptions
    case "error":
    case "error found":
    case "exception":
    case "bug":
      return <FaBug size={22} />;

    // maintenance / other operational notices
    case "maintenance":
    case "maintenance_notice":
    case "maintenance notice":
      return <FaTools size={22} />;

    default:
      return <FaInfoCircle size={20} />;
  }
};

export default function NotificationItem({ item, onMarkRead }) {
  const [hover, setHover] = useState(false);
  const [linkHover, setLinkHover] = useState(false);

  const bg = item.read ? "transparent" : "#f6f6f6";
  const muted = item.read ? "#666" : "#111";
  const linkDefaultColor = "var(--bs-primary, #0d6efd)";

  return (
    <li
      key={item.id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setLinkHover(false);
      }}
      style={{
        padding: "14px 16px",
        marginBottom: "12px",
        borderRadius: 6,
        background: hover ? (item.read ? "#f8f9fa" : "#eef6ff") : bg,
        border: "1px solid",
        borderColor: hover ? "#d0d7df" : "#e7e7e7",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 6px 18px rgba(16,24,40,0.06)" : "none",
        transition:
          "background 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        cursor: "default",
      }}
    >
      {/* Icon */}
      <div style={{ width: 52, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            borderRadius: 6,
            boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
            border: "1px solid #e9e9e9",
          }}
        >
          {getIconByType(item.type)}
        </div>
      </div>

      {/* Main text (left) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: muted,
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.title}
        </div>
        {item.message && (
          <div
            style={{
              marginTop: 6,
              color: "#555",
              fontSize: 14,
              maxWidth: "80%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            {item.message}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ width: 240, textAlign: "center", fontSize: 13, color: "#888", paddingLeft: 12, paddingRight: 12 }}>
        {item.date ? new Date(item.date).toLocaleString() : ""}
      </div>

      {/* Actions (right) */}
      <div style={{ width: 120, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <Link
          to={`/notifications/${item.id}`}
          onMouseEnter={() => setLinkHover(true)}
          onMouseLeave={() => setLinkHover(false)}
          style={{
            textDecoration: "underline",
            fontSize: 14,
            marginRight: 8,
            whiteSpace: "nowrap",
            color: linkHover ? "#000" : linkDefaultColor,
            transition: "color 160ms ease-in-out",
            outline: "none",
            cursor: "pointer",
          }}
        >
          Read more
        </Link>
      </div>
    </li>
  );
}