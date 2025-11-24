import React, { useState } from "react";
import FeatureCard from "./FeatureCard";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

const features = [
    {
        title: "Centralized Management",
        description: "One dashboard for all branches. Live updates and activity logs.",
    },
    {
        title: "Secure Role-Based Access",
        description: "Assign roles like Admin, Accountant, or Manager with protected login.",
    },
    {
        title: "Smart Inventory Tracking",
        description: "Track inventory levels, movement, and transfers with real-time alerts.",
    },
];

const FeatureCarousel = () => {
    const [startIndex, setStartIndex] = useState(0);
    const visibleCount = 3;

    const handlePrev = () => {
        setStartIndex((prev) => Math.max(prev - visibleCount, 0));
    };

    const handleNext = () => {
        setStartIndex((prev) => Math.min(prev + visibleCount, features.length - visibleCount));
    };

    return (
        <section className="py-5 bg-light">
            <div className="container">
                <h4 className="mb-4 text-center">Key Features</h4>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <button className="btn btn-outline-primary" onClick={handlePrev} disabled={startIndex === 0}>
                        <FaArrowLeft />
                    </button>
                    <div className="d-flex overflow-auto">
                        {features.slice(startIndex, startIndex + visibleCount).map((feature, index) => (
                            <FeatureCard key={index} title={feature.title} description={feature.description} />
                        ))}
                    </div>
                    <button
                        className="btn btn-outline-primary"
                        onClick={handleNext}
                        disabled={startIndex + visibleCount >= features.length}
                    >
                        <FaArrowRight />

                    </button>
                </div>
            </div>
        </section>
    );
};

export default FeatureCarousel;