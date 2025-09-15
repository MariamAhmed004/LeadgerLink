import React from "react";

const NavBar = () => (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
            {/* Left corner: logo and title in a flex div */}
            <div className="d-flex align-items-center me-auto">
                {/* Logo as a separate link */}
                <a href="#" className="me-2">
                    <img
                        src="/LeadgerLink_Logo.png"
                        alt="LeadgerLink Logo"
                        width="100"
                        height="40"
                        style={{ objectFit: "contain", display: "block", borderRadius: "20%" }}
                    />
                </a>

                <span style={{ color: "#FFFFFF", size: "150%" }} className="mx-3" ><b>  ||  </b></span>

                {/* Title as its own link */}
                <a className="navbar-brand" href="#">
                    LeadgerLink
                </a>
            </div>
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
