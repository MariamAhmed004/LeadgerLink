import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext"; 
import { useNavigate } from "react-router-dom";


const NavBar = () => {
    const { loggedInUser, setLoggedInUser } = useAuth();
    const navigate = useNavigate(); 

    const isApplicationAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isManager = loggedInUser ?.roles?.includes("Manager");
    const isEmployee = loggedInUser ?.roles?.includes("Employee");

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container">
                {/* Left corner: logo and title */}
                <div className="d-flex align-items-center me-auto">
                    <Link to="/" className="me-2">
                        <img
                            src="/LeadgerLink_Logo.png"
                            alt="LeadgerLink Logo"
                            width="100"
                            height="40"
                            style={{ objectFit: "contain", display: "block", borderRadius: "20%" }}
                        />
                    </Link>

                    <span style={{ color: "#FFFFFF", size: "150%" }} className="mx-3">
                        <b> || </b>
                    </span>

                    <Link to="/" className="navbar-brand">
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
                        {/* Role-based links */}
                        {isApplicationAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link to="/users" className="nav-link">User Administration</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/reports" className="nav-link">Reports</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/settings" className="nav-link">Settings</Link>
                                </li>
                            </>
                        )}

                        {isManager && (
                            <>
                                <li className="nav-item">
                                    <Link to="/sales" className="nav-link">Sales</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/inventory" className="nav-link">Inventory</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/reports" className="nav-link">Reports</Link>
                                </li>
                            </>
                        )}

                        {isEmployee && (
                            <>
                                <li className="nav-item">
                                    <Link to="/recipes" className="nav-link">Recipes</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/branchDetails" className="nav-link">Branch Details</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                                </li>
                            </>
                        )}

                        {/* Guest view */}
                        {!loggedInUser ?.isAuthenticated && (
                            <Link to="/login" className="btn btn-outline-light btn-lg mx-2">
                                Login
                            </Link>
                        )}

                        {/* Show username when logged in and options*/}
                        {loggedInUser?.isAuthenticated && (
                            <li className="nav-item dropdown ms-3">
                                <button
                                    className="btn btn-light dropdown-toggle"
                                    id="userDropdown"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    {loggedInUser.fullName ?? loggedInUser.userName}
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                    <li><Link to="/profile" className="dropdown-item">View Profile</Link></li>
                                    <li><Link to="/notifications" className="dropdown-item">System Notifications</Link></li>
                                    <li>
                                        <button
                                            className="dropdown-item"
                                            onClick={async () => {
                                                try {
                                                    await fetch("/api/auth/Logout", {
                                                        method: "POST",
                                                        credentials: "include"
                                                    });
                                                } catch (err) {
                                                    console.error("Logout failed", err);
                                                } finally {
                                                    setLoggedInUser({
                                                        isAuthenticated: false,
                                                        userName: null,
                                                        roles: [],
                                                        fullName: null,
                                                        userId: null
                                                    });
                                                    navigate("/login");
                                                }
                                            }}
                                        >
                                            Logout
                                        </button>
                                    </li>
                                </ul>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;