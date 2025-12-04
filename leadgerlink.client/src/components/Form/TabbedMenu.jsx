import React, { useState } from "react";
import SearchField from "../Listing/SearchField";

const TabbedMenu = ({ tabs = [], contentMaxHeight = 460 }) => {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.label ?? "");
  const [selectedMap, setSelectedMap] = useState({});
  const [searchMap, setSearchMap] = useState({});

  const active = tabs.find((t) => t.label === activeTab) ?? tabs[0] ?? { items: [], cardComponent: () => null };

  const toggleSelectForActiveTab = (index) => {
    setSelectedMap((prev) => {
      const prevSet = new Set((prev && prev[activeTab]) || []);
      if (prevSet.has(index)) prevSet.delete(index);
      else prevSet.add(index);
      return { ...(prev || {}), [activeTab]: Array.from(prevSet) };
    });
  };

  const onSearchChangeForTab = (tabLabel, value) => {
    setSearchMap((prev) => ({ ...(prev || {}), [tabLabel]: value }));
  };

  const itemsWithIndex = (active.items || []).map((it, idx) => ({ item: it, originalIndex: idx }));
  const activeSearch = (searchMap && searchMap[activeTab]) || "";

  const matchesSearch = (it, q) => {
    if (!q || q.trim() === "") return true;
    const s = q.trim().toLowerCase();
    const name = String(it.item.name ?? it.item.recipeName ?? it.item.productName ?? "").toLowerCase();
    const description = String(it.item.description ?? it.item.desc ?? "").toLowerCase();
    const price = String(it.item.price ?? it.item.sellingPrice ?? "").toLowerCase();
    return name.includes(s) || description.includes(s) || price.includes(s);
  };

  const visible = itemsWithIndex.filter((it) => matchesSearch(it, activeSearch));

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
          {/* search stays visible (not scrolled out) */}
          <SearchField
            value={activeSearch}
            onChange={(v) => onSearchChangeForTab(activeTab, v)}
            placeholder={active.label ? `Search ${active.label}...` : "Search..."}
          />

          {/* Only this area scrolls. hide horizontal overflow to prevent x-scroll from .row negative margins */}
          <div
            style={{
              maxHeight: contentMaxHeight,
              overflowY: "auto",
              overflowX: "hidden",
            }}
            className="position-relative"
          >
            <div className="row gy-4">
              {visible && visible.length > 0 ? (
                visible.map(({ item, originalIndex }) => {
                  const selIndices = selectedMap[activeTab] || [];
                  const isSelected = selIndices.includes(originalIndex);
                  const itemWithSelection = {
                    ...item,
                    isSelected,
                    onSelect: (selectedQty) => {
                      toggleSelectForActiveTab(originalIndex);
                    },
                  };

                  // Render each card in its own full-width row (col-12) so one card per row
                  return (
                    <div key={originalIndex} className="col-12">
                      {active.cardComponent(itemWithSelection)}
                    </div>
                  );
                })
              ) : (
                <div className="col-12">
                  <div className="text-muted">No items available.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabbedMenu;