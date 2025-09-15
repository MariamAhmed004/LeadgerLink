import React from "react";

const NavBar = () => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
    <div className="container">
            <a className="navbar-brand" href="#"><img
                src="../../public/LeadgerLink_Logo.png"
                alt="LeadgerLink Logo"
                width="32"
                height="38"
                className="me-2"
                style={{ objectFit: "contain" }}
            />
                LeadgerLink</a>
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto">
          {/* TODO: Add navigation links here when pages are defined */}
          {/* Example:
          <li className="nav-item">
            <a className="nav-link" href="/dashboard">Dashboard</a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="/profile">Profile</a>
          </li>
          */}
        </ul>
      </div>
    </div>
  </nav>
);

export default NavBar;
