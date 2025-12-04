import React from "react";
import DashboardCard from "./DashboardCard";
import ChartWrapper from "./ChartWrapper";

/*
  Section.jsx
  - Renders section title as a full-width row above content.
  - Supports per-item:
      - colClass: override column class (e.g., "col-12 col-md-6")
      - className: extra class applied to the column wrapper (e.g., "mt-3")
  - Supports "group" to stack cards vertically in a column.
  - Header is bold and underlined. Section uses container-fluid so it can span full page width.
*/
export default function Section({ title, items = [], className = "" }) {
  const renderCard = (it, key) => (
    <DashboardCard title={it.title} value={it.value}>
      {it.children}
    </DashboardCard>
  );

  const computeColClass = (it, defaultSize) => {
    if (it.colClass) return it.colClass;
    const size = it.size ?? defaultSize ?? "small";
    if (size === "large") return "col-12 col-md-8";
    if (size === "medium") return "col-12 col-md-6 col-lg-4";
    return "col-12 col-md-4";
  };

  const renderItem = (it, idx) => {
    const key = it.key ?? `${it.type}-${idx}`;

    if (it.type === "group") {
      const colCls = it.colClass ?? "col-12 col-md-4";
      const wrapperClass = it.className ? ` ${it.className}` : "";
      return (
        <div className={`${colCls} mb-3${wrapperClass}`} key={key}>
          <div className="d-flex flex-column h-100">
            {(it.items || []).map((child, i) => (
              <div className="mb-3" key={`${key}-g-${i}`}>
                <DashboardCard title={child.title} value={child.value}>
                  {child.children}
                </DashboardCard>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (it.type === "card") {
      const colCls = computeColClass(it, "small");
      const wrapperClass = it.className ? ` ${it.className}` : "";
      return (
        <div className={colCls + " mb-3" + wrapperClass} key={key}>
          {renderCard(it, key)}
        </div>
      );
    }

    if (it.type === "chart") {
      const colCls = computeColClass(it, "large");
      const wrapperClass = it.className ? ` ${it.className}` : "";
      return (
        <div className={colCls + " mb-3" + wrapperClass} key={key}>
          <ChartWrapper chartType={it.chartType} height={it.height} options={it.options}>
            {it.children}
          </ChartWrapper>
        </div>
      );
    }

    // fallback: card
    const colCls = computeColClass(it, "small");
    const wrapperClass = it.className ? ` ${it.className}` : "";
    return (
      <div className={`${colCls} mb-3${wrapperClass}`} key={key}>
        <DashboardCard title={it.title}>{it.children}</DashboardCard>
      </div>
    );
  };

  return (
    <section className={`dashboard-section py-4 ${className}`}>
      <div className="container-fluid px-0">
        <div className="row">
          <div className="text-start px-4 col-12">
            <h4 className="mb-4 fw-bold  text-decoration-underline">{title}</h4>
          </div>
        </div>

        <div className="row align-items-start">
          {items.map((it, i) => renderItem(it, i))}
        </div>
      </div>
    </section>
  );
}