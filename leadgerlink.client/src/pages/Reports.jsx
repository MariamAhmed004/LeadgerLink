import React, { useState } from "react";

const sampleReports = [
  { id: 1, name: "Monthly Financials", status: "Completed", date: "2025-09-01" },
  { id: 2, name: "User Activity", status: "Pending", date: "2025-09-15" },
  { id: 3, name: "Ledger Summary", status: "Completed", date: "2025-08-31" },
];

const Reports = () => {
  const [reports, setReports] = useState(sampleReports);
  const [reportName, setReportName] = useState("");
  const [message, setMessage] = useState("");

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!reportName.trim()) {
      setMessage("Please enter a report name.");
      return;
    }
    const newReport = {
      id: reports.length + 1,
      name: reportName,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
    };
    setReports([newReport, ...reports]);
    setReportName("");
    setMessage("Report generation started!");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-primary">Reports</h2>
      <div className="card mb-4 shadow-sm border-primary">
        <div className="card-body">
          <h5 className="card-title mb-3">Generate New Report</h5>
          <form className="row g-2 align-items-center" onSubmit={handleGenerate}>
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Report Name"
                value={reportName}
                onChange={e => setReportName(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-primary w-100">Generate</button>
            </div>
          </form>
          {message && <div className="alert alert-info mt-3 py-2">{message}</div>}
        </div>
      </div>
      <div className="card shadow-sm border-primary">
        <div className="card-body">
          <h5 className="card-title mb-3">Recent Reports</h5>
          <table className="table table-bordered table-hover mb-0">
            <thead className="table-primary">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.name}</td>
                  <td>
                    <span className={`badge ${report.status === "Completed" ? "bg-success" : "bg-warning text-dark"}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{report.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;