import React from "react";
import Card from './HomePageCard';

const CardSection = ({ title, cards }) => (
    <div className="my-5">
        {title && (
            <h5 className=" text-start fw-bold text-dark mb-3 ms-3">
                {title}
            </h5>
        )}
        <div className="row justify-content-center align-items-center">
            {cards.map((card, index) => (
                <div key={index} className="col-md-4 mb-3">
                    <Card title={card.title} value={card.value} />
                </div>
            ))}
        </div>
    </div>
);

export default CardSection;

