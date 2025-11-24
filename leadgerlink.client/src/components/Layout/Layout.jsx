import React from "react";
import { useState } from "react";
import NavBar from "../NavBar/NavBar";
import Sidebar from "../Sidebar/Sidebar";
import Footer from "../Footer/Footer";

const Layout = ({ children }) => {

    return (

        <div className="d-flex flex-column min-vh-100">
        <NavBar />
            <div className="d-flex flex-grow-1" style={{ minHeight: 0, position: "relative" }}>
                                <main className="flex-grow-1 p-4" style={{ overflow: "auto" }}>
                    {children}
                </main>
            </div>
        <Footer />
        </div>
    );
};

export default Layout;
