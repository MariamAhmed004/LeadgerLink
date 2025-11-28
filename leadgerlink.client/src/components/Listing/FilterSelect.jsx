const FilterSelect = ({ label, options, value, onChange }) => (
    <div className="mb-3">
        <select
            className="form-select"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
        >
            <option value="">{label}</option>
            {options.map((opt, index) => (
                <option key={index} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export default FilterSelect;