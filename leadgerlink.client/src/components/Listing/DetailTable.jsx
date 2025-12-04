import React from "react";
import "./listing.css";

const DetailTable = ({ title, rows = [] }) => {
  // rows: array of { label: string, value: ReactNode }
  return (
    <div className="mb-4">
      <table
        className="table table-bordered table-hover detail-table entity-table"
        style={{ width: "100%", tableLayout: "fixed" }}
      >
        {/* keep first column at ~45% so labels don't get pushed into a narrow column */}
        <colgroup>
          <col style={{ width: "30%" }} />
          <col />
        </colgroup>

        <thead>
          <tr>
            <th colSpan="2">
              {title && <span className="detail-table-title mb-3">{title}</span>}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th
                className="detail-label "
                style={{ verticalAlign: "top", wordBreak: "break-word", paddingTop: ".9rem" }}
              >
                {r.label}
              </th>
              <td
                className="detail-value "
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              >
                {r.value}
              </td>
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