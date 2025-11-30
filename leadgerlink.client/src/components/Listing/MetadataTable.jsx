import React from "react";
import "./listing.css";

/*
  MetadataTable
  - Two-column read-only table (label / value)
  - Uses the same visual language as DetailTable but named "MetadataTable"
  - rows: array of { label: string, value: ReactNode }
*/
const MetadataTable = ({ title, rows = [] }) => {
  return (
    <div className="mb-4 ps-4">
          <table className="table table-bordered table-hover detail-table metadata-table">
              <thead >
                  <tr>
                      <th colSpan="2"> {title && <span className="detail-table-title mb-3">{title}</span>} </th></tr>
              </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th className="detail-label">{r.label}</th>
              <td className="detail-value">{r.value}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="text-center text-muted py-4">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MetadataTable;