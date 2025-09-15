import React from "react";

const Sidebar = () => (
    <aside
        className="bg-light border-end vh-100 p-3"
        style={{
            paddingTop: "33rem", // Adds space before content starts
            width: "240px",
            minWidth: "200px"
        }}
    >
    {/* TODO: Add subheaders and links for each navbar section as pages are defined */}
    {/* Example:
    <div className="mb-4">
      <h6 className="text-uppercase text-secondary">Dashboard</h6>
      <ul className="nav flex-column">
        <li className="nav-item">
          <a className="nav-link" href="/dashboard/overview">Overview</a>
        </li>
      </ul>
    </div>
    <div className="mb-4">
      <h6 className="text-uppercase text-secondary">Profile</h6>
      <ul className="nav flex-column">
        <li className="nav-item">
          <a className="nav-link" href="/profile/settings">Settings</a>
        </li>
      </ul>
    </div>
    */}
    <div className="text-muted mt-5">Sidebar content will appear here as sections are added.</div>
  </aside>
);

export default Sidebar;
