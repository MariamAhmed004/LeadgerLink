import React from "react";

const Card = ({ title, value }) => (
    <div className="card shadow-sm border border-secondary rounded text-center mx-2">
        <div
            className="card-header text-dark rounded-top"
            style={{ backgroundColor: "rgba(108,117,125,0.25)" }}
        >
            {title}
        </div>
        <div className="card-body bg-white rounded-bottom py-4">
            <h3 className="text-dark fw-bold mb-0">{value}</h3>
        </div>
    </div>
);

export default Card;