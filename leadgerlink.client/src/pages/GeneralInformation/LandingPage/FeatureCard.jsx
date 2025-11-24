import React from "react";

const FeatureCard = ({ title, description }) => (
    <div className="card bg-secondary text-white p-3 mx-2" style={{ minWidth: "250px" }}>
        <h5 className="card-title">{title}</h5>
        <p className="card-text small">{description}</p>
    </div>
);

export default FeatureCard;