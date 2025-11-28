import { FaSearch } from "react-icons/fa";

const SearchField = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="mb-3">
        <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
                <FaSearch className="text-secondary" />
            </span>
            <input
                type="text"
                className="form-control border-start-0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
            />
        </div>
    </div>
);

export default SearchField;