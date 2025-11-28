const FilterSection = ({ children }) => (
    <div className="bg-light border rounded p-3 mb-4">
        <div className="row gy-3 gx-4">
            {children}
        </div>
    </div>
);

export default FilterSection;