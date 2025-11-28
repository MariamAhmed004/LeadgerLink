const FilterDate = ({ label, value, onChange }) => (
    <div className="mb-3">
        <label className="form-label fw-semibold text-secondary">{label}</label>
        <input
            type="date"
            className="form-control"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default FilterDate;