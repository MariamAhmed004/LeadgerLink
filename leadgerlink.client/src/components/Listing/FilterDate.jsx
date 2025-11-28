const FilterDate = ({ value, onChange }) => (
    <div className="mb-3">
        <input
            type="date"
            className="form-control"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default FilterDate;