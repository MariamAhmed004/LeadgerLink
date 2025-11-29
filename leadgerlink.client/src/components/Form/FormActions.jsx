import React from "react";

const FormActions = ({ onCancel, submitLabel = "Save", loading = false, disabled = false }) => {
    return (
        <div className="mt-4 d-flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={disabled || loading}>
                {loading ? "Saving..." : submitLabel}
            </button>
            <button type="button" className="btn btn-danger" onClick={onCancel} disabled={loading}>
                Cancel
            </button>
        </div>
    );
};

export default FormActions;