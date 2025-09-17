import React from "react";

const stats = [
  { label: "Total Users", value: 128, icon: "bi-people" },
  { label: "Active Ledgers", value: 42, icon: "bi-journal-bookmark" },
  { label: "Pending Reports", value: 7, icon: "bi-file-earmark-text" },
];

const recentActivity = [
  { id: 1, activity: "User Alice created a new ledger.", time: "2 min ago" },
  { id: 2, activity: "Report submitted by Bob.", time: "10 min ago" },
  { id: 3, activity: "Charlie updated settings.", time: "1 hour ago" },
];

const Dashboard = () => (
  <div className="container py-5">
    <h2 className="mb-4 text-primary">Dashboard</h2>
    <div className="row mb-5">
      {stats.map((stat, idx) => (
        <div className="col-md-4 mb-3" key={idx}>
          <div className="card text-center shadow-sm border-primary">
            <div className="card-body">
              <div className="mb-2">
                <i className={`bi ${stat.icon} text-primary`} style={{ fontSize: "2rem" }}></i>
              </div>
              <h5 className="card-title">{stat.label}</h5>
              <p className="display-6 fw-bold text-primary">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="card shadow-sm border-primary">
      <div className="card-body">
        <h5 className="card-title text-primary mb-3">Recent Activity</h5>
        <ul className="list-group list-group-flush">
          {recentActivity.map(item => (
            <li className="list-group-item d-flex justify-content-between align-items-center" key={item.id}>
              <span>{item.activity}</span>
              <span className="badge bg-secondary">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export default Dashboard;