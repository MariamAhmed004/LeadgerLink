import React from "react";
import PageHeader from "../../components/Listing/PageHeader";
import Section from "../../components/Dashboards/Section";
import ChartWrapper from "../../components/Dashboards/ChartWrapper";
import { MdPieChart } from "react-icons/md";

/*
  StoreManagerDashboard.jsx
  - Composed of Section components. Each section is driven by an items array (prompts).
  - Adjusted sizes/heights and column classes to match requested layout.
  - Legends enabled per-chart via options where needed.
  - Chart colors changed to a calm/formal palette (muted blues/greys/teals).
*/

export default function StoreManagerDashboard() {
  const employeeSectionItems = [
    // left small card with top margin, right large chart with increased height
    { type: "card", title: "Top Employee", size: "small", value: "Alice - $3,200", className: "mt-3" },
    {
      type: "chart",
      chartType: "Bar (Top Employees)",
      size: "large",
      height: 360,
      options: {
        // calm/formal palette
        colors: ["#4e6e8e", "#6b8f6b", "#9aa3a8"],
        series: [
          { name: "Sales", data: [18, 32, 40, 55, 78], color: "#4e6e8e" }
        ],
        legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
      }
    }
  ];

  const storeSalesItems = [
    // left large chart with increased height, right stacked small cards
    {
      type: "chart",
      chartType: "Line (Store Sales)",
      size: "large",
      height: 520,
      options: {
        // muted line color
        series: [{ name: "Store Sales", data: [12, 28, 18, 38, 30, 48], color: "#5b6d7a" }],
        legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
      }
    },
    {
      type: "group",
      colClass: "col-12 col-md-4",
      items: [
        { type: "card", title: "Total Sales during November", size: "small", value: "$12,345" },
        { type: "card", title: "Most Selling Product", size: "small", value: "Espresso" }
      ]
    }
  ];

  const itemsUtilization = [
    // left small card with top margin, right pie chart made more square by using half-column + explicit height
    { type: "card", title: "Most Utilized Item", size: "small", value: "Flour - 120 kg", className: "mt-3 mx-5" },
    {
      type: "chart",
      chartType: "Pie (Item Utilization)",
      colClass: "col-12 col-md-6",
      height: 420,
      options: {
        // calm/formal slice colors
        colors: ["#4e6e8e", "#7a9aa0", "#9aa3a8", "#c0c7ca"],
        series: [{
          name: "Utilization",
          data: [
            { name: "Item A", y: 45 },
            { name: "Item B", y: 25 },
            { name: "Item C", y: 15 },
            { name: "Item D", y: 15 }
          ]
        }]
      }
    }
  ];

  const inventoryLevel = [
    // full-width chart, increased height, enable bottom legend
    {
      type: "chart",
      chartType: "Bar (Inventory by Category)",
      colClass: "col-12",
      height: 520,
      options: {
        series: [{ name: "Inventory", data: [20, 40, 50, 70, 95], color: "#6d7fa3" }],
        legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
      }
    }
  ];

  const inventoryTransfers = [
    // two small cards centered using offset (first card offset to center the pair)
    { type: "card", title: "Number of Outgoing Transfers", size: "small", value: "3", colClass: "col-12 col-md-4 offset-md-2" },
    { type: "card", title: "Number of Incoming Transfers", size: "small", value: "5", colClass: "col-12 col-md-4" }
  ];

  return (
    <div className="container py-4">
      <PageHeader
              icon={<MdPieChart size={55} />}
        title="Store Dashboard"
        descriptionLines={["View overall of the store performance."]}
        actions={[]}
      />

      <Section title="Employee Performance" items={employeeSectionItems} />

      <Section title="Store Sales" items={storeSalesItems} />

      <Section title="Items Utilization in Recipes" items={itemsUtilization} />

      <Section title="Inventory Level by Category" items={inventoryLevel} />

      <Section title="Inventory Transfers during current quarter" items={inventoryTransfers} />
    </div>
  );
}