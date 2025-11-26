import React from "react";
import { Link } from 'react-router-dom';
import './HeroBanner.css'; // custom styles

const HeroBanner = () => (
    <section className="hero-banner py-5">
        <div className="container">
            <div className="row align-items-center">
                {/* Left: Text */}
                <div className="col-md-6 text-start">
                    <h1 className="fw-bold text-primary">
                        LedgerLink: Unwavering Precision. Absolute Clarity. Total Control.
                    </h1>
                    <p className="lead mt-3">
                        Your business deserves the best - traceable, present and past. Embrace efficiency.
                    </p>
                    <Link to="/aboutus" className="btn btn-success mt-4 ms-5">Learn About Us</Link>
                </div>

                {/* Right: Image */}
                <div className="col-md-6 text-center">
                    <img
                        src="/images/Landing_Illustration.png"
                        alt="LedgerLink Dashboard"
                        className="img-fluid hero-image"
                    />
                </div>
            </div>
        </div>
    </section>
);

export default HeroBanner;