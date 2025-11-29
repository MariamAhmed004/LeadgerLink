import React from "react";
import FieldWrapper from "./FieldWrapper";

/*
  Generic input field used across forms.
  Props:
    - label, required, value, onChange, type, placeholder, step, min, name, helpText, className
*/
const InputField = ({
  label,
  required = false,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
  min,
  name,
  helpText,
  className = "",
}) => {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} className={className}>
      <input
        name={name}
        type={type}
        className="form-control"
        value={value ?? ""}
        placeholder={placeholder}
        step={step}
        min={min}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
      />
    </FieldWrapper>
  );
};

export default InputField;