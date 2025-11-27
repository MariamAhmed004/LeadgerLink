import React from "react";

const headerBg = "rgba(108,117,125,0.25)";
const outerBorderColor = "#000000";

const HomePageTable = ({ title, columns = [], rows, emptyMessage = "No data available." }) => {
    const isEmpty = !rows || rows.length === 0;
    const colCount = Math.max(1, columns.length);

    return (
        <div className="mb-5">
            <h5 className="text-start fw-bold text-dark mb-3 ms-3">{title}</h5>

            <table
                className="table table-hover"
                style={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    border: `1px solid ${outerBorderColor}`, // outside border (black)
                    borderRadius: "0.375rem",
                    boxShadow: "0 0 12px rgba(0,0,0,0.08)" // subtle shadow like cards
                }}
            >
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th
                                key={i}
                                className="fw-normal"
                                style={{
                                    backgroundColor: headerBg,
                                    color: "#212529",
                                    border: "none",
                                    padding: ".75rem"
                                }}
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {isEmpty ? (
                        <tr>
                            <td
                                colSpan={colCount}
                                className="p-4 text-center text-muted"
                                style={{ border: "none" }}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} style={{ border: "none", padding: ".75rem" }}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default HomePageTable;