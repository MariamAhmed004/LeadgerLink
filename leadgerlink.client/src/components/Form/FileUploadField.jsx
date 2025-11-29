import React, { useState } from "react";
import FieldWrapper from "./FieldWrapper";

const FileUploadField = ({ label, onChange, accept = "image/*", required, helpText, name }) => {
    const [preview, setPreview] = useState(null);

    const handle = (e) => {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }
        onChange && onChange(file);
    };

    return (
        <FieldWrapper label={label} required={required} helpText={helpText}>
            <input name={name} type="file" className="form-control" accept={accept} onChange={handle} />
            {preview && (
                <div className="mt-2">
                    <img src={preview} alt="preview" style={{ maxWidth: "220px", maxHeight: "160px", objectFit: "cover" }} />
                </div>
            )}
        </FieldWrapper>
    );
};

export default FileUploadField;