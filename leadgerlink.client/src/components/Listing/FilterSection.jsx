import SearchField from "./SearchField";
import EntriesPerPageSelector from "./EntriesPerPageSelector";
import "./listing.css";

const FilterSection = ({
  children,
  // always-present bottom controls
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  entriesValue,
  onEntriesChange,
}) => (
  <div className="p-3 mb-0">
    <div className="row gy-3 gx-4">
      {children}
    </div>

    {/* Bottom row: left = entries selector, right = search field */}
    <div className="row mt-5 align-items-center filter-bottom-row">
      <div className="col-md-6 filter-bottom-left">
        <EntriesPerPageSelector value={entriesValue} onChange={onEntriesChange} />
      </div>

      <div className="col-md-6 filter-bottom-right">
        <div className="search-wrapper">
          <SearchField value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} />
        </div>
      </div>
    </div>
  </div>
);

export default FilterSection;