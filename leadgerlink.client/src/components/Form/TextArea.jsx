import React from "react";
import FieldWrapper from "./FieldWrapper";

/*
  TextArea
  Props:
    - label: string
    - required: boolean
    - value: string
    - onChange: (value: string) => void
    - placeholder: string
    - rows: number
    - name: string
    - helpText: string
    - maxLength: number
    - className: string
*/
const TextArea = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  rows = 4,
  name,
  helpText,
  maxLength,
  className = "",
}) => {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} className={className}>
      <textarea
        name={name}
        className="form-control"
        value={value ?? ""}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
      />
    </FieldWrapper>
  );
};

export default TextArea;