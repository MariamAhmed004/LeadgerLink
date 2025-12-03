import React from "react";
import FieldWrapper from "./FieldWrapper";

/*
  Generic input field used across forms.
  Props:
    - label, required, value, onChange, type, placeholder, step, min, name, helpText, className
    - disabled: boolean (optional)
    - readOnly: boolean (optional)
    - inputProps: object (optional) -> spread onto the <input>
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
  disabled = false,
  readOnly = false,
  inputProps = {},
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
        disabled={disabled}
        readOnly={readOnly}
        {...inputProps}
      />
    </FieldWrapper>
  );
};

export default InputField;