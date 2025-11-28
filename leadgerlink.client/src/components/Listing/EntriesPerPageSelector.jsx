const EntriesPerPageSelector = ({ value, onChange, options = [10, 25, 50, 100] }) => (
    <div className="mb-3">
        <label className="form-label fw-semibold text-secondary me-2">Show</label>
        <select
            className="form-select d-inline-block w-auto"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
        <span className="ms-2 text-muted">entries</span>
    </div>
);

export default EntriesPerPageSelector;