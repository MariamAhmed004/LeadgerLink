import React, { useState } from "react";

const TabbedMenu = ({ tabs = [] }) => {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.label ?? "");

  // resolve the active tab object (safe when tabs is empty)
  const active = tabs.find((t) => t.label === activeTab) ?? tabs[0] ?? { items: [], cardComponent: () => null };

  return (
    <div className="mb-4">
      {/* Nav tabs rendered outside the card so header stays transparent */}
      <ul className="nav nav-tabs mb-2" role="tablist">
        {tabs.map((tab) => (
          <li className="nav-item" role="presentation" key={tab.label}>
            <a
              href="#"
              role="tab"
              className={`nav-link ${activeTab === tab.label ? "active" : "text-muted"}`}
              aria-selected={activeTab === tab.label}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(tab.label);
              }}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Card only around the tab content (white background + border) */}
      <div className="card">
        <div className="card-body bg-white">
          <div className="row gy-4">
            {active.items && active.items.length > 0 ? (
              active.items.map((item, index) => (
                <div key={index} className="col-12 col-sm-6 col-md-6 col-lg-4">
                  {active.cardComponent(item)}
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="text-muted">No items available.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabbedMenu;