import React from "react";
import HeroBanner from "./HeroBanner";
import FeatureCarousel from "./FeatureCarousel";

const Landing = () => (
    <main>
        <HeroBanner />

        <section className="py-4">
            <div className="container">
                <h4 className="mb-3 text-primary fw-semibold">
                    Facing common business challenges?
                </h4>
                <ul className="list-unstyled">
                    <li className="mb-2 d-flex align-items-start">
                        <span className="me-2 text-success">✔</span>
                        <span>Issues tracing inventory movement?</span>
                    </li>
                    <li className="mb-2 d-flex align-items-start">
                        <span className="me-2 text-success">✔</span>
                        <span>Managing multiple branches or restaurants?</span>
                    </li>
                    <li className="mb-2 d-flex align-items-start">
                        <span className="me-2 text-success">✔</span>
                        <span>Spending hours consolidating data for accounting?</span>
                    </li>
                </ul>
                <p className="mt-3 text-secondary" style={{ maxWidth: "720px" }}>
                    <strong>LedgerLink</strong> connects your branches, simplifies reporting, and gives you full visibility into your inventory — all in one web-based system.
                </p>
            </div>
        </section>

        <FeatureCarousel />
    </main>
);

export default Landing;