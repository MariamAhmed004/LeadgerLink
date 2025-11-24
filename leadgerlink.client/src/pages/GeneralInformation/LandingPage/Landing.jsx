import React from "react";
import HeroBanner from "./HeroBanner";
import FeatureCarousel from "./FeatureCarousel";

const Landing = () => (
    <main>
        <HeroBanner />

        <section className="py-4 bg-light">
            <div className="container">
                <h4 className="mb-3">Facing common business challenges?</h4>
                <ul className="list-unstyled">
                    <li className="mb-2"> Issues tracing inventory movement?</li>
                    <li className="mb-2"> Managing multiple branches or restaurants?</li>
                    <li className="mb-2"> Spending hours consolidating data for accounting?</li>
                </ul>
                <p className="mt-3">
                    LedgerLink connects your branches, simplifies reporting, and gives you full visibility into your inventory -
                    all in one web-based system.
                </p>
            </div>
        </section>

        <FeatureCarousel />
    </main>
);

export default Landing;