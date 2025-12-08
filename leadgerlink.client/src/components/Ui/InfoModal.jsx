import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

/*
  InfoModal.jsx
  - Generic, accessible info modal component used across the app.
  - Props:
    - show: boolean
    - title: string
    - onClose: () => void
    - children: ReactNode (modal body)
  - Closes on ESC and when clicking the backdrop.
*/

const InfoModal = ({ show, title, onClose, children }) => {
  useEffect(() => {
    if (!show) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  // Heuristic: detect if children contain any action buttons.
  // We consider native <button> elements or anything with a Bootstrap "btn" class.
  const childrenArray = React.Children.toArray(children);
  const hasChildButtons = childrenArray.some((child) => {
    if (!React.isValidElement(child)) return false;

    // direct button element
    if (child.type === "button") return true;

    // elements that include Bootstrap btn classes in their className
    const cls = String(child.props?.className || "");
    if (cls.includes("btn")) return true;

    // Scan one level deep for nested structures commonly used (e.g., wrapper divs containing buttons)
    const nested = React.Children.toArray(child.props?.children || []);
    return nested.some((n) => {
      if (!React.isValidElement(n)) return false;
      if (n.type === "button") return true;
      const ncls = String(n.props?.className || "");
      return ncls.includes("btn");
    });
  });

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={(e) => {
        // close only when clicking backdrop (not modal content)
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Information"}
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: "100%",
          borderRadius: 8,
          boxShadow: "0 8px 30px rgba(2,6,23,0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="card-title mb-0">{title}</h5>
            {!hasChildButtons && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                aria-label="Close"
                onClick={() => onClose?.()}
                title="Close"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="card-text p-3">
            {children}
          </div>

          {!hasChildButtons && (
            <div className="mt-3 text-end">
              <button className="btn btn-primary" onClick={() => onClose?.()}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;