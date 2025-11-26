import React, { useState } from "react";
import FeatureCard from "./FeatureCard";

//importing icons
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { FaDesktop } from "react-icons/fa";         // Centralized Management
import { FaLock } from "react-icons/fa";            // Secure Role-Based Access
import { FaBoxOpen } from "react-icons/fa";         // Smart Inventory Tracking
import { FaChartBar } from "react-icons/fa";        // Interactive Reports & Analytics
import { FaFileInvoice } from "react-icons/fa";     // Automated Transfers & Approvals
import { FaBrain } from "react-icons/fa";           // AI-Assisted Insights
import { FaCloud } from "react-icons/fa";           // Cloud-Based Accessibility
import { FaHistory } from "react-icons/fa";         // Audit Logs
import { FaCogs } from "react-icons/fa";            // Scalable System Design
import { FaBell } from "react-icons/fa";            // Alerts & Notifications

const features = [
    {
        icon: <FaDesktop />,
        title: "Centralized Management",
        tagline: "One dashboard for all branches.",
        description: "View and manage operations from all branches in one secure and unified dashboard. Stay informed with live data updates and activity logs.",
    },
    {
        icon: <FaLock />,
        title: "Secure Role-Based Access",
        tagline: "Control who sees what.",
        description: "Assign specific roles like Admin, Accountant, or Manager — ensuring everyone accesses only what they need through protected login and permissions.",
    },
    {
        icon: <FaBoxOpen />,
        title: "Smart Inventory Tracking",
        tagline: "From stock to sale — tracked.",
        description: "Track inventory levels, movements, and transfers between branches with real-time updates and automated alerts for low stock or pending approvals.",
    },
    {
        icon: <FaChartBar />,
        title: "Interactive Reports & Analytics",
        tagline: "Turn data into decisions.",
        description: "Generate and visualize performance reports with charts and exportable summaries to Excel or PDF, helping managers and accountants make informed decisions.",
    },
    {
        icon: <FaFileInvoice />,
        title: "Automated Transfers & Approvals",
        tagline: "Simplify branch coordination.",
        description: "Streamline inventory transfer requests with built-in approval workflows and notification alerts for pending or completed operations.",
    },
    {
        icon: <FaBrain />,
        title: "AI-Assisted Insights (Prototype Feature)",
        tagline: "Smarter summaries, faster actions.",
        description: "Get AI-generated summaries and recommendations for performance and inventory trends, designed to support quick business decisions.",
    },
    {
        icon: <FaCloud />,
        title: "Cloud-Based Accessibility",
        tagline: "Access anywhere, anytime.",
        description: "Work seamlessly from any device — desktop, tablet, or phone — with data securely stored and synced across all users in real-time.",
    },
    {
        icon: <FaHistory />,
        title: "Audit Logs & Activity History",
        tagline: "Every action, recorded.",
        description: "Maintain transparency with full audit trails that log every user action for compliance, accountability, and security verification.",
    },
    {
        icon: <FaCogs />,
        title: "Scalable System Design",
        tagline: "Built to grow with you.",
        description: "Easily scale your organization by adding new branches, users, and roles without impacting performance or data structure.",
    },
    {
        icon: <FaBell />,
        title: "Alerts & Notifications",
        tagline: "Stay informed, instantly.",
        description: "Receive instant alerts for critical updates such as low stock, transfer approvals, or system errors — keeping your workflow uninterrupted.",
    },
];

const FeatureCarousel = () => {
    const [startIndex, setStartIndex] = useState(0);
    const visibleCount = 3;

    const handlePrev = () => {
        setStartIndex((prev) => Math.max(prev - visibleCount, 0));
    };

    const handleNext = () => {
        setStartIndex((prev) => Math.min(prev + visibleCount, features.length - visibleCount));
    };

    return (
        <section className="py-5">
            <div className="container">
                <h4 className="mb-4 text-center">Key Features</h4>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <button className="btn btn-outline-secondary" onClick={handlePrev} disabled={startIndex === 0}>
                        <FaArrowLeft />
                    </button>
                    <div className="d-flex overflow-auto">
                        {features.slice(startIndex, startIndex + visibleCount).map((feature, index) => (
                            <FeatureCard
                                key={index}
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                            />
                        ))}
                    </div>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={handleNext}
                        disabled={startIndex + visibleCount >= features.length}
                    >
                        <FaArrowRight />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default FeatureCarousel;