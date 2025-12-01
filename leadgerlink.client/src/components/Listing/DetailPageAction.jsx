import React from "react";
import { Link } from "react-router-dom";
import "./listing.css";

/*
  DetailPageAction
  - Reusable action bar for detail pages (right-aligned by default).
  - actions: [{ icon, title, route?, onClick? }]
  - orientation: "vertical" | "horizontal"  (default: "vertical")
  - align: "end" | "center" | "start" (default: "end")
*/
const DetailPageAction = ({ actions = [], orientation = "vertical", align = "end" }) => {
  if (!actions || actions.length === 0) return null;

  const normalized = orientation === "horizontal" ? "horizontal" : "vertical";
  const alignClass =
    align === "center" ? "justify-content-center" :
    align === "start" ? "justify-content-start" : "justify-content-end";

  return (
    <div className={`page-actions-wrapper ${alignClass}`}>
      {/* page-actions will layout buttons according to orientation */}
      <div className={`page-actions ${normalized}`}>
        {actions.map((a, i) => {
          const key = `action-${i}`;
          if (a.route) {
            return (
              <Link
                key={key}
                to={a.route}
                className="btn btn-primary page-action-btn"
                role="button"
                aria-label={a.title}
              >
                {a.icon && <span className="me-2">{a.icon}</span>}
                <span>{a.title}</span>
              </Link>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={a.onClick}
              className="btn btn-primary page-action-btn"
              aria-label={a.title}
            >
              {a.icon && <span className="me-2">{a.icon}</span>}
              <span>{a.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DetailPageAction;