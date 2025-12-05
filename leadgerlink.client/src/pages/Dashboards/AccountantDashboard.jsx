import React from "react";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSelect from "../../components/Listing/FilterSelect";
import Section from "../../components/Dashboards/Section";
import DashboardCard from "../../components/Dashboards/DashboardCard";
import ChartWrapper from "../../components/Dashboards/ChartWrapper";
import HomePageTable from "../../components/homepages/HomePageTable";
import { MdPieChart } from "react-icons/md";

/*
  AccountantDashboard.jsx
  - Uses the shared dashboard primitives (Section, DashboardCard, ChartWrapper).
  - Static demo values only (no network calls) and calm/formal palette.
  - Filter uses existing FilterSelect. Table uses HomePageTable component.
*/

const calmPalette = ["#4e6e8e", "#7a9aa0", "#9aa3a8", "#c0c7ca"];

export default function AccountantDashboard() {
  const branchOptions = [
    { label: "All Branches (Accumulated Values)", value: "" },
    { label: "Main Store", value: "main" },
    { label: "Branch A", value: "a" },
    { label: "Branch B", value: "b" }
  ];

  // Sample table rows for latest inventory movements
  const inventoryRows = [
    ["Main Store", "Branch A", "Rejected", "120.00 BHD"],
    ["Branch B", "Main Store", "Completed", "45.50 BHD"],
    ["Branch A", "Branch B", "Out for delivery", "78.20 BHD"]
  ];

  return (
    <div className="container py-4">
      <PageHeader
              icon={<MdPieChart size={55} />}
        title="Accountant Dashboard"
        descriptionLines={["Following overview of the organization stores details, you can filter the first section to store specific detials."]}
        actions={[]}
      />

          {/* Filter row */}
      
      <div className="row align-items-center my-3 mt-5 ">
        <div className="col-12 col-md-8 text-end">
          <h4 className="mb-0">Filter Details to per store</h4>
        </div>
        <div className="col-12 col-md-4 d-flex justify-content-md-start mt-4 ">
          <FilterSelect
            label=""
            value={""}
            onChange={() => {}}
            options={branchOptions}
          />
        </div>
      </div>

      {/* Financial Metrics */}
      <Section title="Financial Metrics" items={[
        { type: "card", title: "COGS (Food Cost)", size: "small", value: "BHD 3,420" },
        { type: "card", title: "Gross Profit", size: "small", value: "BHD 12,345" },
        { type: "card", title: "Profit Margin (%)", size: "small", value: "28.4%" },
      ]} />

      {/* Inventory section: left value card, right bar chart */}
      <Section title="Inventory" items={[
        { type: "card", title: "Inventory Value", size: "small", value: "BHD 45,200" },
        {
          type: "chart",
          chartType: "Bar (Inventory Value)",
          size: "large",
          height: 320,
          options: {
            series: [{ name: "Inventory Value", data: [12, 28, 34, 48, 62], color: calmPalette[0] }],
            legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
          }
        }
      ]} />

      {/* Sales: two small cards centered + full width line chart */}
      <Section title="Sales" items={[
        // centered pair using colClass offsets
        { type: "card", title: "Total Sales during November", size: "small", value: "BHD 98,400", colClass: "col-12 col-md-4 offset-md-2" },
        { type: "card", title: "Most Selling Product", size: "small", value: "Espresso", colClass: "col-12 col-md-4" },
        {
          type: "chart",
          chartType: "Line (Store Sales)",
          colClass: "col-12",
          height: 340,
          options: {
            series: [{ name: "Sales", data: [1200, 2400, 1800, 3000, 2600, 3500], color: calmPalette[1] }],
            legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
          }
        }
      ]} />

      <hr/>

      {/* Store Sales Contribution (pie) - centered */}
      <Section title="Store Sales Contribution" items={[
        {
          type: "chart",
          chartType: "Pie (Store Sales Contribution)",
          // center pie by offsetting column
          colClass: "col-12 col-md-6 offset-md-3",
          height: 380,
          options: {
            colors: calmPalette,
            series: [{
              name: "Share",
              data: [
                { name: "Main Store", y: 45 },
                { name: "Branch A", y: 25 },
                { name: "Branch B", y: 20 },
                { name: "Branch C", y: 10 }
              ]
            }],
            // explicit legend for pie (will render to the right if wrapper supports it)
            legend: { enabled: true, layout: "vertical", align: "right", verticalAlign: "middle" }
          }
        }
      ]} />

      {/* Inventory Movements: two small cards centered then movement chart */}
      <Section title="Inventory Movements" items={[
        { type: "card", title: "Number of Pending Transfers", size: "small", value: "4", colClass: "col-12 col-md-4 offset-md-2" },
        { type: "card", title: "Number of Completed Transfers", size: "small", value: "18", colClass: "col-12 col-md-4" },
        {
          type: "chart",
          chartType: "Bar (Inventory Movements)",
          colClass: "col-12",
          height: 380,
          options: {
            series: [{ name: "Movements", data: [10, 22, 30, 44, 60], color: calmPalette[2] }],
            legend: { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom" }
          }
        }
      ]} />

      {/* Latest inventory movements table */}
      <div className="mt-4">
        <HomePageTable
          title="Latest Inventory Movements"
          columns={["Requester", "Requested From", "Status", "Value"]}
          rows={inventoryRows}
          emptyMessage="No inventory movements to display."
        />
      </div>
    </div>
  );
}