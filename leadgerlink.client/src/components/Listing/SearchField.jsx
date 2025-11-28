const SearchField = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="mb-3">
        <input
            type="text"
            className="form-control"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

export default SearchField;