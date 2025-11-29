import React from "react";
import FieldWrapper from "./FieldWrapper";

const SelectField = ({ label, required, value, onChange, options = [], disabled = false, helpText, name }) => {
    return (
        <FieldWrapper label={label} required={required} helpText={helpText}>
            <select
                name={name}
                className="form-select"
                value={value ?? ""}
                onChange={(e) => onChange && onChange(e.target.value)}
                disabled={disabled}
                required={required}
            >
                {options.map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                        {opt.label ?? opt}
                    </option>
                ))}
            </select>
        </FieldWrapper>
    );
};

export default SelectField;