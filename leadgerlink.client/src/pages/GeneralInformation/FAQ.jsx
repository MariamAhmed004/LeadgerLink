import React from "react";
import { FaQuestionCircle } from "react-icons/fa";

const FAQ = () => (
    <main className="container text-start py-5">
        <div className="d-flex align-items-center">
            <FaQuestionCircle size={50} className="text-secondary me-3" />
            <h1 style={{ textDecoration: 'underline' }} className="mb-0">Frequently Asked Questions</h1>
        </div>
        <p className="text-muted" style={{ marginLeft: '6%' }}>
            Need help with something? Here are our most frequently asked questions.
        </p>

        <div className="accordion" id="faqAccordion">
            <div className="accordion-item">
                <h2 className="accordion-header" id="q1">
                    <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#a1" aria-expanded="true" aria-controls="a1">
                        Q1. What is LedgerLink?
                    </button>
                </h2>
                <div id="a1" className="accordion-collapse collapse show" aria-labelledby="q1" data-bs-parent="#faqAccordion">
                    <div className="accordion-body">
                        LedgerLink is a responsive web-based system that connects company branches with the central accounting department. It manages inventory, sales, receipts, transfer requests, dashboards, and reporting across multiple branches.
                    </div>
                </div>
            </div>

            {[
                {
                    q: "Q2. Who can use LedgerLink?",
                    a: "LedgerLink supports five roles: Application Admin, Organization Admin, Accountant, Branch Manager, and Branch Employee — each with defined permissions."
                },
                {
                    q: "Q3. Is my data secure?",
                    a: "Yes. LedgerLink encrypts all passwords and sensitive data, and applies Two-Factor Authentication (2FA) for administrative accounts."
                },
                {
                    q: "Q4. Can I use LedgerLink on different devices?",
                    a: "Yes. LedgerLink is a responsive web application that works on desktops, tablets, and mobile devices."
                },
                {
                    q: "Q5. How fast does the system load?",
                    a: "Under normal network conditions, dashboards and reports load within 3 seconds for optimal performance."
                },
                {
                    q: "Q6. How many users can use the system at once?",
                    a: "LedgerLink supports at least 100 concurrent users without performance issues."
                },
                {
                    q: "Q7. Can users edit their profiles?",
                    a: "Yes, all users can view and update their personal information and communication details from their profile settings."
                },
                {
                    q: "Q8. Is LedgerLink accessible for users with disabilities?",
                    a: "Absolutely. LedgerLink follows WCAG accessibility standards to ensure usability for everyone."
                }
            ].map((item, index) => {
                const id = `a${index + 2}`;
                const headerId = `q${index + 2}`;
                return (
                    <div className="accordion-item" key={index}>
                        <h2 className="accordion-header" id={headerId}>
                            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#${id}`} aria-expanded="false" aria-controls={id}>
                                {item.q}
                            </button>
                        </h2>
                        <div id={id} className="accordion-collapse collapse" aria-labelledby={headerId} data-bs-parent="#faqAccordion">
                            <div className="accordion-body">{item.a}</div>
                        </div>
                    </div>
                );
            })}
        </div>

        <p className="mt-5">
            Any more questions? We’re here to support you at <strong>support@ledgerlink.com</strong>
        </p>
    </main>
);

export default FAQ;
