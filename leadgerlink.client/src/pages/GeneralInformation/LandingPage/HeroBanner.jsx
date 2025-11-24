import React from "react";
import { Link } from 'react-router-dom';

const HeroBanner = () => (
    <section className="bg-light py-5 text-center">
        <div className="container">
            <h1 className="display-5 fw-bold text-primary">
                LedgerLink: Unwavering Precision. Absolute Clarity. Total Control.
            </h1>
            <p className="lead mt-3">
                Your business deserves the best - traceable, present and past. Embrace efficiency.
            </p>
            <Link to="/aboutus" className="btn btn-success mt-4">Learn About Us</Link>
        </div>
    </section>
);

export default HeroBanner;