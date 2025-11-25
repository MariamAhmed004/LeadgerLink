import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { FaFileInvoice } from "react-icons/fa";
import { MdOutlineInventory } from "react-icons/md";
import { FaBookBookmark } from "react-icons/fa6";
import { BiSolidPackage } from "react-icons/bi";
import { BiSolidBuildings } from "react-icons/bi";
import { HiUsers } from "react-icons/hi";
import { HiOutlineDocumentSearch } from "react-icons/hi";

const NavBar = () => {
    const { loggedInUser, setLoggedInUser } = useAuth();
    const navigate = useNavigate();

    const isApplicationAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
    const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
    const isStoreManager = loggedInUser?.roles?.includes("Store Manager");
    const isStoreEmployee = loggedInUser?.roles?.includes("Store Employee");

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
                        {/* Application Admin */}
                        {isApplicationAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link to="/organizations" className="nav-link"><BiSolidBuildings />Organizations</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/users" className="nav-link"><HiUsers />Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/applicationauditlogs" className="nav-link"><HiOutlineDocumentSearch />Audit Logs</Link>
                                </li>                                
                            </>
                        )}

                        {/* Organization Admin */}
                        {isOrgAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link to="/org-admin-dashboard" className="nav-link">Org Admin Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/org-settings" className="nav-link">Organization Settings</Link>
                                </li>
                            </>
                        )}

                        {/* Organization Accountant */}
                        {isOrgAccountant && (
                            <>
                                <li className="nav-item">
                                    <Link to="/org-accounting" className="nav-link">Accounting</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/org-reports" className="nav-link">Financial Reports</Link>
                                </li>
                            </>
                        )}

                        {/* Store Manager */}
                        {isStoreManager && (
                            <>
                                <li className="nav-item">
                                    <Link to="/store-dashboard" className="nav-link">Store Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/store-inventory" className="nav-link">Inventory</Link>
                                </li>
                            </>
                        )}

                        {/* Store Employee */}
                        {isStoreEmployee && (
                            <>
                                <li className="nav-item">
                                    <Link to="/store-tasks" className="nav-link"><FaFileInvoice />Sales</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/store-profile" className="nav-link"><MdOutlineInventory />Inventory</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/store-profile" className="nav-link"><FaBookBookmark />Recipes</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/store-profile" className="nav-link"><BiSolidPackage />Products</Link>
                                </li>
                            </>
                        )}

                        {/* Guest view */}
                        {!loggedInUser?.isAuthenticated && (
                            <Link to="/login" className="btn btn-outline-light btn-lg mx-2">
                                Login
                            </Link>
                        )}

                        {/* Logged-in dropdown */}
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