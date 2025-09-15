import React from 'react';
import { Link } from 'react-router-dom';

const features = [
    {
        title: "Easy Ledger Tracking",
        description: "Effortlessly monitor and manage your financial records with intuitive tools."
    },
    {
        title: "Secure Cloud Storage",
        description: "Your data is encrypted and safely stored in the cloud for easy access anywhere."
    },
    {
        title: "Real-Time Collaboration",
        description: "Work together with your team instantly and keep everyone up to date."
    }
];

const Landing = () => {
    return (
        <div className="landing-page container py-5">
            <header className="text-center mb-5">
                <h1 className="display-4 fw-bold">Welcome to LeadgerLink</h1>
                <p className="lead text-secondary">Your gateway to streamlined ledger management.</p>
            </header>
            <main>
                <section>
                    <h2 className="text-center mb-4 text-primary">Main Features</h2>
                    <div className="row justify-content-center mb-5">
                        {features.map((feature, idx) => (
                            <div className="col-md-4 mb-4" key={idx}>
                                <div className="card h-100 shadow-sm border-primary">
                                    <div className="card-body">
                                        <h5 className="card-title text-primary">{feature.title}</h5>
                                        <p className="card-text text-secondary">{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="text-center">
                    <h2 className="mb-4 text-primary">Get Started</h2>
                    <Link to="/signup" className="btn btn-secondary btn-lg mx-2">Sign Up</Link>
                    <Link to="/login" className="btn btn-outline-primary btn-lg mx-2">Login</Link>
                </section>
            </main>
        </div>
    );
};

export default Landing;