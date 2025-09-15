import React from "react";
import { useState } from "react";
import NavBar from "../NavBar/NavBar";
import Sidebar from "../Sidebar/Sidebar";
import Footer from "../Footer/Footer";

const Layout = ({ children }) => {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleToggleSidebar = () => setSidebarOpen((open) => !open);


    return (

        <div className="d-flex flex-column min-vh-100">
        <NavBar />
            <div className="d-flex flex-grow-1" style={{ minHeight: 0, position: "relative" }}>
                {/* Toggle button for sidebar */}
                <button
                    className="btn p-0"
                    onClick={handleToggleSidebar}
                    style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        zIndex: 1050,
                        background: "none",
                        border: "none"
                    }}
                    aria-label="Toggle sidebar"
                >
                    <img
                        src="../../public/images/sidebar_icon.png" 
                        alt="Toggle sidebar"
                        width="36"
                        height="36"
                        style={{ borderRadius: "8px" }}
                    />
                </button>
                {sidebarOpen && <Sidebar />}
                <main className="flex-grow-1 p-4" style={{ overflow: "auto" }}>
                    {children}
                </main>
            </div>
        <Footer />
        </div>
    );
};

export default Layout;
