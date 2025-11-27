import React from "react";
import { Link } from "react-router-dom";

const QuickAccessPanel = ({ actions }) => (
    <div className="mb-4">
        <h5 className="text-start fw-bold text-dark mb-3 ms-3">Quick Access</h5>

        <div className="row gx-3 gy-3 justify-content-center">
            {actions.map((action, index) => (
                <div key={index} className="col-12 col-md-4 d-flex">
                    <Link
                        to={action.route}
                        className="w-100 text-decoration-none"
                    >
                        <div
                            className="card shadow-sm border border-secondary rounded text-center w-100 h-100"
                            style={{ backgroundColor: "rgba(108,117,125,0.25)" }}
                        >
                            <div className="card-body d-flex align-items-center justify-content-center py-5">
                                <span
                                    className="me-3 text-dark"
                                    style={{ fontSize: "1.9rem", lineHeight: 1 }}
                                >
                                    {action.icon}
                                </span>
                                <span
                                    className="fw-medium text-dark"
                                    style={{ fontSize: "1.05rem" }}
                                >
                                    {action.label}
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    </div>
);

export default QuickAccessPanel;