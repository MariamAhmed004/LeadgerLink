import React, { useState, useMemo, useEffect } from "react";
import SearchField from "../Listing/SearchField";

/*
  TabbedMenu
  - Keeps each tab mounted to preserve per-card state.
  - Tracks selected quantities per tab and per item index.
  - Calls onSelectionChange with a flat array of { tabLabel, index, productId, name, price, quantity }
    whenever any item's quantity changes.
  - Extras: supports optional per-tab id hints via `idKey` (read from item) and `selectionIdProp` (prop name in selection)
    without breaking existing behavior.
  - NEW: Supports preselection via `initialSelectedQty` on items. If > 0, the item is initialized as selected
    with that quantity.
*/
const TabbedMenu = ({ tabs = [], contentMaxHeight = 460, onSelectionChange }) => {
  const initialLabel = tabs?.[0]?.label ?? "";
  const [activeTab, setActiveTab] = useState(initialLabel);
  const [selectedMap, setSelectedMap] = useState({}); // per-tab array of selected indices
  const [searchMap, setSearchMap] = useState({});
  const [quantityMap, setQuantityMap] = useState({}); // per-tab { index: qty }

  const preparedTabs = useMemo(
    () =>
      tabs.map((t) => ({
        ...t,
        items: (t.items || []).map((it) => ({
          ...it,
          // normalize price numeric alongside display value, support string like "3.000 BHD"
          priceValue: (() => {
            const raw = it.price ?? it.sellingPrice ?? 0;
            const num = typeof raw === "string" ? Number((raw.match(/[0-9.]+/) || [0])[0]) : Number(raw);
            return Number.isFinite(num) ? num : 0;
          })(),
        })),
      })),
    [tabs]
  );

  // Initialize selection from items' initialSelectedQty (if provided)
  useEffect(() => {
    const nextQtyMap = {};
    const nextSelMap = {};

    preparedTabs.forEach((tab) => {
      const label = tab.label;
      const items = tab.items || [];
      const qmap = {};
      const sel = [];

      items.forEach((it, idx) => {
        const initQty = Number(it.initialSelectedQty ?? 0);
        if (initQty > 0) {
          qmap[idx] = initQty;
          sel.push(idx);
        }
      });

      if (Object.keys(qmap).length > 0) nextQtyMap[label] = qmap;
      if (sel.length > 0) nextSelMap[label] = sel;
    });

    // Only update if different to avoid clobbering user edits
    setQuantityMap((prev) => ({ ...prev, ...nextQtyMap }));
    setSelectedMap((prev) => ({ ...prev, ...nextSelMap }));
  }, [preparedTabs]);

  const setQtyForTab = (tabLabel, index, qty) => {
    setQuantityMap((prev) => {
      const map = { ...(prev[tabLabel] || {}) };
      if (qty > 0) map[index] = qty;
      else delete map[index];
      const next = { ...(prev || {}), [tabLabel]: map };

      // compute aggregated selection payload for callback
      if (typeof onSelectionChange === "function") {
        const selection = [];
        preparedTabs.forEach((t) => {
          const label = t.label;
          const items = t.items || [];
          const qmap = next[label] || {};

          const idKey = t.idKey || null; // optional id key to read from items
          const selectionIdProp = t.selectionIdProp || null; // optional prop name in selection

          Object.keys(qmap).forEach((k) => {
            const idx = Number(k);
            const item = items[idx] || {};

            const fallbackProductId = item.productId ?? item.id ?? null;
            const hintedIdValue = idKey ? item[idKey] ?? null : null;

            const sel = {
              tabLabel: label,
              index: idx,
              productId: fallbackProductId,
              name: item.name ?? item.recipeName ?? item.productName ?? "",
              price: item.price ?? item.sellingPrice ?? 0,
              quantity: qmap[idx] ?? 0,
            };

            // Emit the hinted identifier alongside existing fields (non-breaking)
            if (selectionIdProp && hintedIdValue != null) {
              sel[selectionIdProp] = hintedIdValue;
            }

            selection.push(sel);
          });
        });
        onSelectionChange(selection);
      }

      return next;
    });

    // maintain selected indices alongside qty (used for card styling)
    setSelectedMap((prev) => {
      const prevSet = new Set((prev && prev[tabLabel]) || []);
      if (qty > 0) prevSet.add(index);
      else prevSet.delete(index);
      return { ...(prev || {}), [tabLabel]: Array.from(prevSet) };
    });
  };

  const onSearchChangeForTab = (tabLabel, value) => {
    setSearchMap((prev) => ({ ...(prev || {}), [tabLabel]: value }));
  };

  const matchesSearch = (it, q) => {
    if (!q || q.trim() === "") return true;
    const s = q.trim().toLowerCase();
    const name = String(it.item.name ?? it.item.recipeName ?? it.item.productName ?? "").toLowerCase();
    const description = String(it.item.description ?? it.item.desc ?? "").toLowerCase();
    const price = String(it.item.price ?? it.item.sellingPrice ?? "").toLowerCase();
    return name.includes(s) || description.includes(s) || price.includes(s);
  };

  return (
    <div className="mb-4">
      {/* Tabs header */}
      <ul className="nav nav-tabs mb-2" role="tablist">
        {preparedTabs.map((tab) => (
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

      {/* Content container */}
      <div className="card">
        <div className="card-body bg-white">
          {preparedTabs.map((tab) => {
            const tabLabel = tab.label;
            const itemsWithIndex = (tab.items || []).map((it, idx) => ({ item: it, originalIndex: idx }));
            const searchValue = (searchMap && searchMap[tabLabel]) || "";
            const visibleItems = itemsWithIndex.filter((it) => matchesSearch(it, searchValue));
            const selIndices = selectedMap[tabLabel] || [];

            return (
              <div key={`content-${tabLabel}`} style={{ display: activeTab === tabLabel ? "block" : "none" }}>
                <SearchField
                  value={searchValue}
                  onChange={(v) => onSearchChangeForTab(tabLabel, v)}
                  placeholder={tabLabel ? `Search ${tabLabel}...` : "Search..."}
                />

                <div
                  style={{
                    maxHeight: contentMaxHeight,
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                  className="position-relative"
                >
                  <div className="row gy-4">
                    {visibleItems && visibleItems.length > 0 ? (
                      visibleItems.map(({ item, originalIndex }) => {
                        const isSelected = selIndices.includes(originalIndex);
                        const qtyFromMap = (quantityMap[tabLabel] || {})[originalIndex] || 0;
                        const itemWithSelection = {
                          ...item,
                          isSelected,
                          selectedQty: qtyFromMap,
                          onSelect: (selectedQty) => {
                            // selectedQty provided by MenuTabCard when user changes quantity or toggles select
                            setQtyForTab(tabLabel, originalIndex, Number(selectedQty) || 0);
                          },
                        };

                        const cardKey = `${tabLabel}-${originalIndex}`;

                        return (
                          <div key={cardKey} className="col-12">
                            {tab.cardComponent(itemWithSelection)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabbedMenu;