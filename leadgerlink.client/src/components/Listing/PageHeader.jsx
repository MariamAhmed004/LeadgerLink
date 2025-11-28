import React from "react";
import { Link } from "react-router-dom";
import "./listing.css";

const PageHeader = ({
  title,
  icon,
  descriptionLines = [],
  // backward-compatible single action
  actionLabel,
  actionRoute,
  // new actions array: [{ icon, title, route }]
  actions = []
}) => {
  // merge backward-compatible single action into actions array if provided
  const allActions = [...actions];
  if (actionLabel && actionRoute) {
    allActions.unshift({ icon: null, title: actionLabel, route: actionRoute });
  }

  return (
      <div className="d-flex justify-content-between align-items-start mb-4 w-100 text-start">
          <div style={{ flexBasis: "66%" }} className="ms-3">
        <div className="d-flex align-items-center">
          {icon && <span className="me-3">{icon}</span>}
          <h4 className="fw-bold text-dark mb-1">{title}</h4>
        </div>

        <hr className="my-2" style={{ opacity: 0.85 }} />

              {descriptionLines && descriptionLines.length > 0 && (
                  <div className="mx-3">
            {/* First description line - black */}
            {descriptionLines[0] && (
              <p className="mb-1 text-dark">
                {descriptionLines[0]}
              </p>
            )}

            {/* Second description line - grey */}
            {descriptionLines[1] && (
              <p className="mb-1 text-muted">
                {descriptionLines[1]}
              </p>
            )}

            {/* Any additional lines (if present) rendered muted */}
            {descriptionLines.slice(2).map((line, i) => (
              <p key={i} className="mb-1 text-muted">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="page-header-actions">
        {allActions.map((act, idx) => (
          <Link
            key={idx}
            to={act.route}
            className="btn btn-primary page-header-btn"
            role="button"
          >
            {act.icon && <span className="me-2">{act.icon}</span>}
            <span>{act.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PageHeader;