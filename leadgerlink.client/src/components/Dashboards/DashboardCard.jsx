import React from "react";

/*
  DashboardCard.jsx
  - Simple card with header row and body.
  - Props: title, value (optional, displayed prominently), children
*/
export default function DashboardCard({ title, value, children }) {
  return (
    <div className="card h-100 shadow-sm border">
      <div className="card-header text-center bg-light py-2">
        <span className="text-muted">{title}</span>
      </div>
      <div className="card-body d-flex flex-column justify-content-center align-items-center" style={{ minHeight: 80 }}>
        {value !== undefined && value !== null ? (
          <>
            <div className="h4">{value}</div>
            {children ? <div className="small text-muted mt-2 w-100 text-center">{children}</div> : null}
          </>
        ) : (
          children ?? null
        )}
      </div>
    </div>
  );
}