const FilterSelect = ({ label, options, value, onChange }) => (
    <div className="mb-3">
        <label className="form-label fw-semibold text-secondary">{label}</label>
        <select
            className="form-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((opt, index) => (
                <option key={index} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export default FilterSelect;