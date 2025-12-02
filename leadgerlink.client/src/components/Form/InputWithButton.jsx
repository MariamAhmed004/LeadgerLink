import React from "react";
import FieldWrapper from "./FieldWrapper";

/*
  InputWithButton
  - A Bootstrap-style input group: text input + adjacent button.
  - Props:
    - label, required, helpText (passed to FieldWrapper)
    - value, onChange (string, (value) => void)
    - placeholder, name, type
    - buttonLabel, buttonIcon (React node), onButtonClick
    - buttonType (defaults to "button"), buttonVariant ("primary" etc.)
    - disabled
    - inputProps, buttonProps (spread onto respective elements)
*/

const InputWithButton = ({
  label,
  required = false,
  helpText,
  value = "",
  onChange,
  placeholder = "",
  name,
  type = "text",
  buttonLabel = "Go",
  buttonIcon = null,
  onButtonClick,
  buttonType = "button",
  buttonVariant = "primary",
  disabled = false,
  inputProps = {},
  buttonProps = {},
  className = ""
}) => {
  const handleInputChange = (e) => {
    onChange && onChange(e.target.value);
  };

  const handleButtonClick = (e) => {
    if (disabled) return;
    onButtonClick && onButtonClick(e);
  };

  // combine provided button className with variant
  const btnClass = `btn btn-${buttonVariant} ${buttonProps.className ?? ""}`.trim();

  return (
    <FieldWrapper label={label} required={required} helpText={helpText} className={className}>
      <div className="input-group">
        <input
          type={type}
          name={name}
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          aria-label={label ?? placeholder}
          {...inputProps}
        />
        <button
          type={buttonType}
          className={btnClass}
          onClick={handleButtonClick}
          disabled={disabled || buttonProps.disabled}
          {...buttonProps}
        >
          {buttonIcon && <span className="me-2">{buttonIcon}</span>}
          {buttonLabel}
        </button>
      </div>
    </FieldWrapper>
  );
};

export default InputWithButton;