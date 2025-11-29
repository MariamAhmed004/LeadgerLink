import React from "react";

const FieldWrapper = ({ label, required, helpText, children, className = "" }) => {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
};

export default FieldWrapper;