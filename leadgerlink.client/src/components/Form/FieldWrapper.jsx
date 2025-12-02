import React from "react";

const FieldWrapper = ({ label, required, helpText, children, className = "" }) => {
  return (
    <div className={className}>
      {label && (
        // enforce labels to be left-aligned for all form fields
        <label className="form-label text-start d-block">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
};

export default FieldWrapper;