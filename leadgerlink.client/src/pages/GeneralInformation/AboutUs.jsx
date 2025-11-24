import React from "react";
import {
    FaInfoCircle,
    FaBullseye,
    FaTasks,
    FaUsers,
    FaCheckCircle,
    FaFlag,
} from "react-icons/fa";

// Section component with default and override background support
const Section = ({ icon: Icon, title, children, bgColor }) => (
    <section
        className="p-3 rounded mb-2"
        style={{
            background: bgColor || 'rgba(50, 93, 136, 0.2)',
        }}
    >
        <div
            className="d-flex align-items-center mb-2 p-3"
            style={{ minHeight: '90px' }}
        >
            <div style={{ width: '70%' }}>
                <h5 style={{ fontWeight: 'bold', textDecoration: "underline" }} className="mb-3">{title}</h5>
                {children}
            </div>
            <div
                style={{
                    width: '30%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Icon size={125} />
            </div>
        </div>
    </section>
);

const AboutUs = () => (
    <main className="container text-start py-4">
        {/* Page Header */}
        <div className="d-flex align-items-center mb-2">
            <FaInfoCircle size={48} className="text-secondary me-2" />
            <h1 style={{ textDecoration: "underline" }} className="mb-0">About Us</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: "6%" }}>
            Connect your business with its management securely and efficiently. Every detail is preserved, every action traceable. Minimize waste, maximize clarity.
        </p>

        {/* Sections */}
        <Section icon={FaInfoCircle} title="About LedgerLink" bgColor="#EEEEEE"> 
            <p className="mb-0">
                LedgerLink is a web-based system designed to streamline the operational reporting process across multiple branches and the central accounting department. It aims to eliminate manual errors, reduce spreadsheet dependency, and enhance data accuracy for decision-making.
            </p>
        </Section>

        <Section icon={FaBullseye} title="Our Purpose" bgColor="#fff">
            <p className="mb-0">
                We built LedgerLink to solve the critical issue of inaccurate and delayed reporting. By automating data entry, organizing branch workflows, and providing real-time insights, LedgerLink ensures that accountants always receive reliable information.
            </p>
        </Section>

        <Section icon={FaTasks} title="What We Do">
            <ul className="mb-0">
                <li>Track inventory usage across branches</li>
                <li>Manage sales and recipes</li>
                <li>Monitor stock transfers with full traceability</li>
                <li>Provide branch-level and organization-level dashboards</li>
                <li>Generate visual and exportable reports</li>
            </ul>
        </Section>

        <Section icon={FaUsers} title="Who We Serve" bgColor="#EEEEEE">
            <p className="mb-2">Our system supports a clear hierarchy of roles:</p>
            <ul className="mb-2">
                <li>Organization Administrator</li>
                <li>Accountant</li>
                <li>Branch Manager</li>
                <li>Branch Employee</li>
            </ul>
            <p className="mb-0">Each role receives tailored access and features based on their responsibilities.</p>
        </Section>

        <Section icon={FaCheckCircle} title="Our Commitment to Quality" bgColor="#fff">
            <ul className="mb-0">
                <li>Clear and validated requirements</li>
                <li>Documented processes</li>
                <li>Quality assurance and testing</li>
                <li>Secure authentication and access control</li>
                <li>Scalable and maintainable architecture</li>
            </ul>
        </Section>

        <Section icon={FaFlag} title="Our Mission">
            <p className="mb-2">To deliver a system that ensures:</p>
            <ul className="mb-2">
                <li>Accurate reporting</li>
                <li>Full traceability</li>
                <li>Streamlined communication</li>
                <li>Reliable and real-time data flow</li>
            </ul>
            <p className="mb-0">Helping organizations maintain control and make informed decisions.</p>
        </Section>
    </main>
);

export default AboutUs;
