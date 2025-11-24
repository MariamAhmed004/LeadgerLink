import React from "react";
import { FaFileContract } from "react-icons/fa";

const TermsOfService = () => (
    <main className="container text-start py-5">
        <div className="d-flex align-items-center">
            <FaFileContract size={55} className="text-secondary me-2" />
            <h1 style={{ textDecoration: 'underline' }} className="mb-0">Terms of Service</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '6%' }}>Effective Date: November 16, 2025</p>

        <p>
            By using LedgerLink, users agree to comply with these terms.
        </p>

        <h5 className="mt-4">1. Purpose of the System</h5>
        <p>
            LedgerLink is designed to streamline operational reporting between branches and the central accounting team.
            It supports inventory, sales, recipe management, forecasting, and reporting.
        </p>

        <h5 className="mt-4">2. User Accounts</h5>
        <ul>
            <li>Maintain accurate account credentials</li>
            <li>Choose strong passwords and manage permissions</li>
            <li>Avoid sharing login details with others</li>
            <li>Add, remove, modify, or disable user accounts based on organizational needs</li>
        </ul>

        <h5 className="mt-4">3. Permitted Use</h5>
        <ul>
            <li>Input accurate and truthful data</li>
            <li>Use the system for legitimate organizational operations</li>
            <li>Facilitate workflows for transfers, approvals, and reporting</li>
        </ul>

        <h5 className="mt-4">4. Prohibited Activities</h5>
        <ul>
            <li>Attempt unauthorized access to restricted data</li>
            <li>Use the system to propagate fraudulent reports</li>
            <li>Engage in activities that compromise system security</li>
        </ul>

        <h5 className="mt-4">5. System Availability</h5>
        <p>
            While the system is designed for high reliability, temporary interruptions may occur due to maintenance,
            upgrades, or technical issues.
        </p>

        <h5 className="mt-4">6. Data Accuracy</h5>
        <p>
            LedgerLink is a tool for structuring and accuracy of site data. The responsibility for data accuracy rests
            with the user. LedgerLink provides tools to monitor errors, but final responsibility lies with the user.
        </p>

        <h5 className="mt-4">7. Liability Limitations</h5>
        <p>
            As a prototype system, LedgerLink carries no legal liability. It is intended for demonstration and academic
            purposes only.
        </p>

        <h5 className="mt-4">8. Amendments</h5>
        <p>
            These terms may be updated as the system evolves or moves from prototype to production.
        </p>
    </main>
);

export default TermsOfService;