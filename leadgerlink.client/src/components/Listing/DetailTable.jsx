import React from "react";
import "./listing.css";

const DetailTable = ({ title, rows = [] }) => {
  // rows: array of { label: string, value: ReactNode }
  return (
    <div className="mb-4">
      

          <table className="table table-bordered table-hover detail-table entity-table">
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

export default DetailTable;