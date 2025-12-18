import React from "react";
import './NavBar.css';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { FaFileInvoice } from "react-icons/fa";
import { MdOutlineInventory } from "react-icons/md";
import { FaBookBookmark } from "react-icons/fa6";
import { BiSolidPackage } from "react-icons/bi";
import { BiSolidBuildings } from "react-icons/bi";
import { HiUsers } from "react-icons/hi";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { MdManageAccounts } from "react-icons/md";
import { MdPieChart } from "react-icons/md";
import { HiMiniDocumentText } from "react-icons/hi2";
import { FaStore } from "react-icons/fa";
import { GiGearStickPattern } from "react-icons/gi";

const NavBar = () => {
    const { loggedInUser, setLoggedInUser } = useAuth();
    const navigate = useNavigate();

    const isApplicationAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
    const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
    const isStoreManager = loggedInUser?.roles?.includes("Store Manager");
    const isStoreEmployee = loggedInUser?.roles?.includes("Store Employee");


    // Compute home route once based on highest-priority role
    const homeRoute =
        isApplicationAdmin ? "/app-admin" :
            isOrgAdmin ? "/org-admin" :
                isOrgAccountant ? "/org-accountant" :
                    isStoreManager ? "/store-manager" :
                        isStoreEmployee ? "/store-employee" :
                            "/";



    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container">
                {/* Left corner: logo and title */}
                <div className="d-flex align-items-center me-auto">
                    <Link to={homeRoute} className="me-2">
                        <img
                            src="/LeadgerLink_Logo.png"
                            alt="LeadgerLink Logo"
                            width="100"
                            height="40"
                            style={{ objectFit: "contain", display: "block", borderRadius: "20%" }}
                        />
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
                    {/* Left-side navigation items */}
                    <ul className="navbar-nav">
                        {/* Application Admin */}
                        {isApplicationAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link to="/organizations" className="nav-link"><BiSolidBuildings size={22} className="me-2" />Organizations</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/users" className="nav-link"><HiUsers size={22} className="me-2" />Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/applicationauditlogs" className="nav-link"><HiOutlineDocumentSearch size={22} className="me-2" />Audit Logs</Link>
                                </li>
                            </>
                        )}

                        {/* Organization Admin */}
                        {isOrgAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link to="/stores" className="nav-link"><FaStore size={22} className="me-2"  />Stores</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/users" className="nav-link"><HiUsers size={22} className="me-2" />Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/organizationauditlogs" className="nav-link"><HiOutlineDocumentSearch size={22} className="me-2" />Audit Logs</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/accountant-dashboard" className="nav-link"><MdPieChart size={22} className="me-2" />Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/reports" className="nav-link"><HiMiniDocumentText size={22} className="me-2" />Reports</Link>
                                </li>
                                <li className="nav-item dropdown">
                                    <a className="nav-link dropdown-toggle" href="#" id="storeInventoryDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <GiGearStickPattern size={22} className="me-2" />Business Operations
                                    </a>
                                    <ul className="dropdown-menu" aria-labelledby="storeInventoryDropdown">
                                        <li><Link to="/sales" className="dropdown-item">Sales</Link></li>
                                        <li><Link to="/inventory" className="dropdown-item">Inventory Items</Link></li>
                                        <li><Link to="/inventory/transfers" className="dropdown-item">Inventory Transfers</Link></li>
                                        <li><Link to="/recipes" className="dropdown-item">Recipes</Link></li>
                                        <li><Link to="/products" className="dropdown-item">Products</Link></li>
                                    </ul>
                                </li>
                            </>
                        )}

                        {/* Organization Accountant */}
                        {isOrgAccountant && (
                            <>
                                <li className="nav-item">
                                    <Link to="/accountant-dashboard" className="nav-link"><MdPieChart size={22} className="me-2" />Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/reports" className="nav-link"><HiMiniDocumentText size={22} className="me-2" />Reports</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/users" className="nav-link"><HiUsers size={22} className="me-2" />Users</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/organizationauditlogs" className="nav-link"><HiOutlineDocumentSearch size={22} className="me-2" />Audit Logs</Link>
                                </li>
                            </>
                        )}

                        {/* Store Manager */}
                        {isStoreManager && (
                            <>
                                <li className="nav-item">
                                    <Link to="/sales" className="nav-link"><FaFileInvoice size={22} className="me-2" />Sales</Link>
                                </li>
                                <li className="nav-item dropdown">
                                    <a className="nav-link dropdown-toggle" href="#" id="storeInventoryDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <MdOutlineInventory size={22} className="me-2" />Inventory
                                    </a>
                                    <ul className="dropdown-menu" aria-labelledby="storeInventoryDropdown">
                                        <li><Link to="/inventory" className="dropdown-item">Inventory Items</Link></li>
                                        <li><Link to="/inventory/transfers" className="dropdown-item">Inventory Transfers</Link></li>
                                    </ul>
                                </li>
                                <li className="nav-item">
                                    <Link to="/recipes" className="nav-link"><FaBookBookmark size={22} className="me-2" />Recipes</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/products" className="nav-link"><BiSolidPackage size={22} className="me-2" />Products</Link>
                                </li>
                                <li className="nav-item dropdown">
                                    <a className="nav-link dropdown-toggle" href="#" id="storeInventoryDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <MdManageAccounts size={22} className="me-2" />Management
                                    </a>
                                    <ul className="dropdown-menu" aria-labelledby="storeInventoryDropdown">
                                        <li><Link to="/users" className="dropdown-item">Users Management</Link></li>
                                        <li><Link to="/store-manager-dashboard" className="dropdown-item">Store Dashboard</Link></li>
                                        <li><Link to="/reports" className="dropdown-item">Report Generation</Link></li>
                                    </ul>
                                </li>
                            </>
                        )}

                        {/* Store Employee */}
                        {isStoreEmployee && (
                            <>
                                <li className="nav-item">
                                    <Link to="/sales" className="nav-link"><FaFileInvoice size={22} className="me-2" />Sales</Link>
                                </li>
                                 <li className="nav-item dropdown">
                                       <a className="nav-link dropdown-toggle" href="#" id="storeInventoryDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                             <MdOutlineInventory size={22} className="me-2" />Inventory
                                           </a>
                                       <ul className="dropdown-menu" aria-labelledby="storeInventoryDropdown">
                                             <li><Link to="/inventory" className="dropdown-item">Inventory Items</Link></li>
                                        <li><Link to="/inventory/transfers" className="dropdown-item">Inventory Transfers</Link></li>
                                           </ul>
                                 </li>
                                <li className="nav-item">
                                    <Link to="/recipes" className="nav-link"><FaBookBookmark size={22} className="me-2" />Recipes</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/products" className="nav-link"><BiSolidPackage size={22} className="me-2" />Products</Link>
                                </li>
                            </>
                        )}
                    </ul>

                    {/* Right-side (further right) items */}
                    <ul className="navbar-nav ms-auto">
                        {/* Guest view */}
                        {!loggedInUser?.isAuthenticated && (
                            <li className="nav-item">
                                <Link to="/login" className="btn btn-outline-light btn-lg mx-2">
                                    Login
                                </Link>
                            </li>
                        )}

                        {/* Logged-in dropdown */}
                        {loggedInUser?.isAuthenticated && (
                            <li className="nav-item dropdown me-1">
                                <button
                                    className="btn btn-dark dropdown-toggle"
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
                                                    navigate("/");
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