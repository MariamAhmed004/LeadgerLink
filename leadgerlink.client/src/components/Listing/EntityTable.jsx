import { Link } from "react-router-dom";
import "./listing.css";

const EntityTable = ({
  title,
  columns,
  rows,
  emptyMessage,
  linkColumnName,
  rowLink,
  ariaLabelledBy, // optional id of existing heading on the page
}) => {
  const ariaProps = ariaLabelledBy
    ? { "aria-labelledby": ariaLabelledBy }
    : title
    ? { "aria-label": title }
    : {};

  return (
    <div className="mb-4 entity-table-container">
      <table className="table table-bordered table-hover entity-table" {...ariaProps}>
        {/* If no ariaLabelledBy was provided but title exists, expose it for screen readers */}
        {!ariaLabelledBy && title ? (
          <caption className="visually-hidden">{title}</caption>
        ) : null}

        <thead className="table-light">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="text-center">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => {
                  const isLinkCell =
                    linkColumnName &&
                    columns[cellIndex] === linkColumnName &&
                    typeof rowLink === "function";

                  if (isLinkCell) {
                    const url = rowLink(row, rowIndex);
                    return (
                      <td key={cellIndex} className="text-center align-middle">
                        <Link
                          to={url}
                          className="table-row-link text-decoration-underline fw-semibold d-inline-block"
                        >
                          {cell}
                        </Link>
                      </td>
                    );
                  }

                  return <td key={cellIndex} className="text-center align-middle">{cell}</td>;
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted py-4">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EntityTable;