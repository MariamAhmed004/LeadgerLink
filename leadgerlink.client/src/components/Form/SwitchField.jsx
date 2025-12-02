import React from "react";
import FieldWrapper from "./FieldWrapper";

const SwitchField = ({ label, checked, onChange, helpText, name }) => {
  const id = name ?? `switch-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <FieldWrapper helpText={helpText} className="d-flex align-items-start justify-content-between">
      <label htmlFor={id} className="form-label text-start mb-0" style={{ marginRight: "1rem" }}>
        {label}
      </label>

      <div className="form-check form-switch m-0" style={{ marginTop: 6 }}>
        <input
          id={id}
          name={name}
          className="form-check-input"
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          aria-checked={!!checked}
          style={{ transform: "translateY(0.15rem)" }}
        />
      </div>
    </FieldWrapper>
  );
};

export default SwitchField;