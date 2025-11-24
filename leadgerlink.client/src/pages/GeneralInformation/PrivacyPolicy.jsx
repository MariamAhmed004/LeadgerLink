import React from "react";
import { FaShieldAlt } from "react-icons/fa";

const PrivacyPolicy = () => (
    <main className="container text-start py-5">
        <div className="d-flex align-items-center ">
            <FaShieldAlt size={55} className="text-secondary me-2" />
            <h1 style={{ textDecoration: 'underline' }} className="mb-0">Privacy Policy</h1>

        </div>
        <p className="text-muted" style={{ marginLeft: '6%' }}>Last Updated: November 16, 2025</p>

        <p>
            LedgerLink is committed to protecting user data and ensuring transparency in how information is processed within
            the system. This Privacy Policy outlines how LedgerLink collects, stores, and uses information.
        </p>

        <h5 className="mt-4">1. Information We Collect</h5>
        <ul>
            <li>User identification details (name, email)</li>
            <li>Store-generated data (sales, inventory, recipes, sales entries)</li>
            <li>Time-stamped logs and activity metrics</li>
            <li>System audit logs for security and monitoring</li>
        </ul>

        <h5 className="mt-4">2. How Data is Used</h5>
        <ul>
            <li>Generating dashboards and reports</li>
            <li>Monitoring store performance and employee tracking</li>
            <li>Enhancing user experience</li>
            <li>Maintaining secure access and audit trails</li>
        </ul>

        <h5 className="mt-4">3. Data Security</h5>
        <ul>
            <li>Data encryption (AES-256)</li>
            <li>Secure socket layer (SSL) protocols</li>
            <li>Role-based access control</li>
            <li>Regular software and firewall updates</li>
            <li>System monitoring for active users</li>
        </ul>

        <h5 className="mt-4">4. Data Sharing</h5>
        <p>
            Data is shared within the organization. Access is restricted based on user permissions and organizational
            hierarchy.
        </p>

        <h5 className="mt-4">5. Data Storage</h5>
        <p>
            Data is stored in a structured, normalized database to ensure accuracy, consistency, and reliability.
        </p>

        <h5 className="mt-4">6. User Responsibilities</h5>
        <ul>
            <li>Keep login credentials secure</li>
            <li>Report suspicious activity</li>
            <li>Follow data usage guidelines</li>
        </ul>

        <h5 className="mt-4">7. Changes to This Policy</h5>
        <p>
            This is a non-binding privacy outline and may evolve as the system develops into a full software product.
        </p>
    </main>
);

export default PrivacyPolicy;
