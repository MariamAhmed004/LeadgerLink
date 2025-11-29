import React from "react";
import FieldWrapper from "./FieldWrapper";

// helper to convert Date -> yyyy-MM-ddTHH:mm (local) for input[type=datetime-local]
const toDatetimeLocal = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const min = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const TimestampField = ({ label, value, onChange, required, helpText, name }) => {
    const val = value ? toDatetimeLocal(value) : toDatetimeLocal(new Date());
    return (
        <FieldWrapper label={label} required={required} helpText={helpText}>
            <input
                name={name}
                type="datetime-local"
                className="form-control"
                value={val}
                onChange={(e) => onChange && onChange(new Date(e.target.value))}
                required={required}
            />
        </FieldWrapper>
    );
};

export default TimestampField;