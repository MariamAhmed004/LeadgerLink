import React from "react";
import { Link } from 'react-router-dom';

const NavBar = () => (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
            {/* Left corner: logo and title in a flex div */}
            <div className="d-flex align-items-center me-auto">
                {/* Logo as a separate link */}
                <Link to="/" className="me-2">
                    <img
                        src="/LeadgerLink_Logo.png"
                        alt="LeadgerLink Logo"
                        width="100"
                        height="40"
                        style={{ objectFit: "contain", display: "block", borderRadius: "20%" }}
                    />
                </Link>

                <span style={{ color: "#FFFFFF", size: "150%" }} className="mx-3" ><b>  ||  </b></span>

                {/* Title as its own link */}
                <Link to="/" className="navbar-brand" href="#">
                    LeadgerLink
                </Link>
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

                    <li className="nav-item">
                        <Link to="/sales" className="nav-link">Sales</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/inventory" className="nav-link">Inventory</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/recipes" className="nav-link">Recipes</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/branchDetails" className="nav-link">Branch Details</Link>
                    </li>
                    
                    <li className="nav-item">
                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/reports" className="nav-link">Reports</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/users" className="nav-link">User Adminstration</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/settings" className="nav-link">Settings</Link>
                    </li>

                </ul>
            </div>
        </div>
    </nav>
);

export default NavBar;
