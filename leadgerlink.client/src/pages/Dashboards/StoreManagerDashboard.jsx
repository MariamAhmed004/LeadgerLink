import React, { useEffect, useState } from "react";
import PageHeader from "../../components/Listing/PageHeader";
import Section from "../../components/Dashboards/Section";
import ChartWrapper from "../../components/Dashboards/ChartWrapper";
import { MdPieChart } from "react-icons/md";

/*
  StoreManagerDashboard.jsx
  Displays a store-level dashboard for managers, including employee performance, sales, item utilization, inventory levels, and transfer movements.
*/

export default function StoreManagerDashboard() {
  // State and data fetch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;

    // --- Fetch dashboard data on mount ---
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch('/api/dashboard/store/summary?months=6&topN=5', { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }
        const json = await res.json();
        if (!mounted) return;
        setData(json);
      } catch (ex) {
        console.error('Failed to load dashboard data', ex);
        if (mounted) setError('Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, []);

  // Employee Performance Section --- Top Employee card, Top Employees bar chart
  const employeeSectionItems = [];

  // Store Sales Section --- Store Sales line chart, Sales summary cards group
  const storeSalesItems = [];

  // Items Utilization Section --- Most Utilized Item card, Item Utilization pie chart
  const itemsUtilization = [];

  // Inventory Level Section --- Inventory by Category bar chart
  const inventoryLevel = [];

  // Inventory Transfers Section --- Outgoing Transfers card, Incoming Transfers card
  const inventoryTransfers = [];

  // --------------------------------------------------
  // Build items arrays based on fetched data with safe fallbacks
  // --------------------------------------------------
  if (data) {

    // --------------------------------------------------
    // Top Employees
    // --------------------------------------------------
    const topEmployees = Array.isArray(data.topEmployees) ? data.topEmployees : [];

    employeeSectionItems.push(
      // --- Top Employee card ---
      { type: 'card', title: 'Top Employee', size: 'small', value: topEmployees.length ? `${topEmployees[0].name} - BHD ${Number(topEmployees[0].value).toFixed(3)}` : 'N/A', className: 'mt-3' }
    );

    const empSeries = [
      // --- Employee sales series ---
      { name: 'Sales', data: topEmployees.map(e => Number(e.value || 0)) }
    ];

    const empCategories = topEmployees.map(e => e.name ?? '');

    employeeSectionItems.push(
      // --- Top Employees bar chart ---
      {
        type: 'chart',
        chartType: 'Bar (Top Employees)',
        size: 'large',
        height: 360,
        options: {
          chart: { type: 'column' },
          xAxis: { categories: empCategories },
          series: empSeries,
          colors: ['#4e6e8e'],
          legend: { enabled: false }
        }
      }
    );

    // --------------------------------------------------
    // Store Sales series (time series)
    // --------------------------------------------------
    const salesSeries = data.salesSeries ?? data.salesSeries ?? { labels: [], values: [] };

    const labels = Array.isArray(salesSeries.labels) ? salesSeries.labels : [];

    const values = Array.isArray(salesSeries.values) ? salesSeries.values.map(v => Number(v)) : [];

    storeSalesItems.push(
      // --- Store Sales line chart ---
      {
        type: 'chart',
        chartType: 'Line (Store Sales)',
        size: 'large',
        height: 520,
        options: {
          chart: { type: 'line' },
          xAxis: { categories: labels },
          series: [{ name: 'Store Sales', data: values }],
          colors: ['#5b6d7a'],
          legend: { enabled: false }
        }
      }
    );

    // --------------------------------------------------
    // Items Utilization and Most Selling Product
    // --------------------------------------------------
    const itemsUtil = Array.isArray(data.itemsUtil) ? data.itemsUtil : [];

    // If available, prefer server-provided most selling product name; fall back to itemsUtil or topEmployees
    const mostSellingProductName = data.mostSellingProductName ?? (itemsUtil.length ? itemsUtil[0].name : "");

    storeSalesItems.push(
      // --- Sales summary cards group ---
      { type: 'group', colClass: 'col-12 col-md-4', items: [
        { type: 'card', title: 'Total Sales (period)', size: 'small', value: `BHD ${values.reduce((a,b) => a + (b||0), 0).toFixed(3)}` },
        { type: 'card', title: 'Most Selling Product', size: 'small', value: mostSellingProductName }
      ]}
    );

    // --------------------------------------------------
    // Items utilization (pie)
    // --------------------------------------------------
    itemsUtilization.push(
      // --- Most Utilized Item card ---
      { type: 'card', title: 'Most Utilized Item', size: 'small', value: itemsUtil.length ? `${itemsUtil[0].name} - ${itemsUtil[0].value}` : 'N/A', className: 'mt-3 mx-5' }
    );

    itemsUtilization.push(
      // --- Item Utilization pie chart ---
      {
        type: 'chart',
        chartType: 'Pie (Item Utilization)',
        colClass: 'col-12 col-md-6',
        height: 450,
        options: {
          series: [{ name: 'Utilization', data: itemsUtil.map(i => ({ name: i.name, y: Number(i.value || 0) })) }],
          colors: ['#4e6e8e', '#7a9aa0', '#9aa3a8', '#c0c7ca'],
          legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            itemMarginTop: 2,
            itemStyle: { fontSize: "12px" }
          }
        }
      }
    );

    // --------------------------------------------------
    // Inventory by category (bar)
    // --------------------------------------------------
    const invByCat = Array.isArray(data.invByCat) ? data.invByCat : [];

    inventoryLevel.push(
      // --- Inventory by Category bar chart ---
      {
        type: 'chart',
        chartType: 'Bar (Inventory by Category)',
        colClass: 'col-12',
        height: 520,
        options: {
          chart: { type: 'column' },
          xAxis: { categories: invByCat.map(i => i.name) },
          series: [{ name: 'Inventory', data: invByCat.map(i => Number(i.value || 0)) }],
          colors: ['#6d7fa3'],
          legend: { enabled: false }
        }
      }
    );

    // --------------------------------------------------
    // Transfers
    // --------------------------------------------------
    const transfers = data.transfers ?? { outgoing: 0, incoming: 0 };

    inventoryTransfers.push(
      // --- Outgoing Transfers card ---
      { type: 'card', title: 'Number of Outgoing Transfers', size: 'small', value: String(transfers.outgoing ?? 0), colClass: 'col-12 col-md-4 offset-md-2' }
    );

    inventoryTransfers.push(
      // --- Incoming Transfers card ---
      { type: 'card', title: 'Number of Incoming Transfers', size: 'small', value: String(transfers.incoming ?? 0), colClass: 'col-12 col-md-4' }
    );
  }

  // Fallback static demo when loading or on error
  if (!data && !loading) {
    // simple empty states
  }

  // --------------------------------------------------
  // Render dashboard sections
  // --------------------------------------------------
  return (
    <div className="container py-4">
      <PageHeader
        icon={<MdPieChart size={55} />}
        title="Store Dashboard"
        descriptionLines={["The following summary displays sales, inventory, and key performance metrics for the last 6 months, highlighting the top 5 results in each section."]}
        actions={[]}
      />

      {loading && <div className="alert alert-info">Loading dashboard ...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <Section title="Employee Performance" items={employeeSectionItems} />
      <Section title="Store Sales" items={storeSalesItems} />
      <Section title="Items Utilization in Recipes" items={itemsUtilization} />
      <Section title="Inventory Level by Category" items={inventoryLevel} />
      <Section title="Inventory Transfers Movement" items={inventoryTransfers} />
    </div>
  );
}