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

  // Build a compact page list with ellipses when many pages exist.
  const getPageItems = () => {
    const total = totalPages;
    if (total <= 9) {
      // small number of pages -> show all
      return pages;
    }

    const siblingCount = 1; // pages shown on each side of current
    const left = Math.max(2, currentPage - siblingCount);
    const right = Math.min(total - 1, currentPage + siblingCount);

    const showLeftEllipsis = left > 2;
    const showRightEllipsis = right < total - 1;

    const items = [1];

    if (showLeftEllipsis) {
      items.push("left-ellipsis");
    } else {
      for (let p = 2; p < left; p++) items.push(p);
    }

    for (let p = left; p <= right; p++) items.push(p);

    if (showRightEllipsis) {
      items.push("right-ellipsis");
    } else {
      for (let p = right + 1; p < total; p++) items.push(p);
    }

    items.push(total);
    return items;
  };

  const pageItems = getPageItems();

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

          {/* Page numbers with ellipses */}
          {pageItems.map((item, idx) => {
            if (typeof item === "number") {
              const page = item;
              return (
                <li key={page} className={`page-item ${page === currentPage ? "active" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => onPageChange(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                </li>
              );
            }

            // ellipsis placeholder (non-interactive)
            return (
              <li key={`ellipsis-${idx}`} className="page-item disabled">
                <span className="page-link" aria-hidden="true">...</span>
              </li>
            );
          })}

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