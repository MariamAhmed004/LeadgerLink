import React from "react";

const FeatureCard = ({ title, description, icon }) => (
    <div className="card bg-secondary text-white p-3 mx-2" style={{ minWidth: "250px" }}>
        <div className="d-flex align-items-start">
            <div
                className="d-flex align-items-center justify-content-center text-dark"
                style={{ width: 48, height: 48, fontSize: 22 }}
                aria-hidden="true"
            >
                {icon}
            </div>
            <div className="ms-3 text-start">
                <h5 className="card-title">{title}</h5>
                <p className="card-text small mb-0">{description}</p>
            </div>
        </div>
    </div>
);

export default FeatureCard;