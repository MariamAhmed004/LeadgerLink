import React from "react";

/*
  TitledGroup
  - Wraps children inside a bordered box with a title that visually overlaps the top border.
  - Props:
    - title: string (required) - text shown on the box header
    - subtitle: string (optional) - small helper text under the title
    - className: string (optional) - additional classes for the outer container
    - titleClassName: string (optional) - classes applied to the title element
    - children: React nodes
*/
const TitledGroup = ({ title, subtitle, className = "", titleClassName = "", children }) => {
  return (
    <div className={`position-relative mb-3  ${className}`}>
      <div
        className={`border rounded p-3`}
        style={{ paddingTop: "1.25rem", background: "transparent" }}
      >
        {/* Title sits visually above the box content.
            Use the application's page background color (#f5f5f5) to blend the title with the page. */}
        <div
          className={`position-absolute ${titleClassName}`}
          style={{
            left: "1rem",
            top: "-0.65rem",
            background: "#f5f5f5",
            padding: "0 .6rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            lineHeight: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            zIndex: 1
          }}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </div>

              <div className="mt-1 p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default TitledGroup;