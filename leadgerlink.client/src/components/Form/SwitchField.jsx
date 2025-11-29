import React from "react";
import FieldWrapper from "./FieldWrapper";

const SwitchField = ({ label, checked, onChange, helpText, name }) => {
    return (
        <FieldWrapper label={label} helpText={helpText} className="form-check form-switch">
            <input
                name={name}
                className="form-check-input"
                type="checkbox"
                checked={!!checked}
                onChange={(e) => onChange && onChange(e.target.checked)}
            />
        </FieldWrapper>
    );
};

export default SwitchField;