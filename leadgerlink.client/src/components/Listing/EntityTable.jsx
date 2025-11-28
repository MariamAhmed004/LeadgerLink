const EntityTable = ({ title, columns, rows, emptyMessage }) => (
    <div className="mb-4">
        {title && <h5 className="fw-bold text-primary mb-3">{title}</h5>}
        <table className="table table-bordered table-hover">
            <thead className="table-light">
                <tr>
                    {columns.map((col, index) => (
                        <th key={index}>{col}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length > 0 ? (
                    rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell}</td>
                            ))}
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

export default EntityTable;