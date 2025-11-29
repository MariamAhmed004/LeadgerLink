const PaginationSection = ({
  currentPage,
  totalPages,
  onPageChange,
  entriesPerPage,
  totalEntries,
}) => {
  const pages = Array.from({ length: Math.max(0, totalPages) }, (_, i) => i + 1);

  const canShowRange =
    typeof totalEntries === "number" && typeof entriesPerPage === "number" && totalEntries > 0;

  const startIndex = canShowRange ? (currentPage - 1) * entriesPerPage + 1 : 0;
  const endIndex = canShowRange ? Math.min(currentPage * entriesPerPage, totalEntries) : 0;

  const goFirst = () => onPageChange(1);
  const goPrev = () => onPageChange(Math.max(1, currentPage - 1));
  const goNext = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const goLast = () => onPageChange(Math.max(1, totalPages));

  const isFirstDisabled = currentPage <= 1;
  const isLastDisabled = currentPage >= totalPages || totalPages === 0;

  return (
    <nav className="mt-3" aria-label="Table pagination">
      <div className="d-flex justify-content-between align-items-center px-5">
        <div className="small">
          {canShowRange ? (
            <>Showing {startIndex} to {endIndex} from {totalEntries} entries</>
          ) : (
            // keep empty space so layout doesn't jump when range is not provided
            <span>&nbsp;</span>
          )}
        </div>

        <ul className="pagination mb-0">
          {/* First & Previous */}
          <li className={`page-item ${isFirstDisabled ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={goFirst}
              disabled={isFirstDisabled}
              aria-label="First"
            >
              &laquo;&laquo;
            </button>
          </li>
          <li className={`page-item ${isFirstDisabled ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={goPrev}
              disabled={isFirstDisabled}
              aria-label="Previous"
            >
              &laquo;
            </button>
          </li>

          {/* Page numbers */}
          {pages.map((page) => (
            <li key={page} className={`page-item ${page === currentPage ? "active" : ""}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          ))}

          {/* Next & Last */}
          <li className={`page-item ${isLastDisabled ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={goNext}
              disabled={isLastDisabled}
              aria-label="Next"
            >
              &raquo;
            </button>
          </li>
          <li className={`page-item ${isLastDisabled ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={goLast}
              disabled={isLastDisabled}
              aria-label="Last"
            >
              &raquo;&raquo;
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default PaginationSection;