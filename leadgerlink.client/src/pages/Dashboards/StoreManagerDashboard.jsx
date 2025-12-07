import React, { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
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

  // build items arrays based on fetched data with safe fallbacks
  const employeeSectionItems = [];
  const storeSalesItems = [];
  const itemsUtilization = [];
  const inventoryLevel = [];
  const inventoryTransfers = [];

  if (data) {
    // Top Employees
    const topEmployees = Array.isArray(data.topEmployees) ? data.topEmployees : [];
    employeeSectionItems.push({ type: 'card', title: 'Top Employee', size: 'small', value: topEmployees.length ? `${topEmployees[0].name} - BHD ${Number(topEmployees[0].value).toFixed(3)}` : 'N/A', className: 'mt-3' });
    const empSeries = [{ name: 'Sales', data: topEmployees.map(e => Number(e.value || 0)) }];
    const empCategories = topEmployees.map(e => e.name ?? '');
    employeeSectionItems.push({
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
    });

    // Store Sales series (time series)
    const salesSeries = data.salesSeries ?? data.salesSeries ?? { labels: [], values: [] };
    const labels = Array.isArray(salesSeries.labels) ? salesSeries.labels : [];
    const values = Array.isArray(salesSeries.values) ? salesSeries.values.map(v => Number(v)) : [];
    storeSalesItems.push({
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
    });

    const itemsUtil = Array.isArray(data.itemsUtil) ? data.itemsUtil : [];
    // If available, prefer server-provided most selling product name; fall back to itemsUtil or topEmployees
    const mostSellingProductName = data.mostSellingProductName ?? (itemsUtil.length ? itemsUtil[0].name : "");

    storeSalesItems.push({ type: 'group', colClass: 'col-12 col-md-4', items: [
      { type: 'card', title: 'Total Sales (period)', size: 'small', value: `BHD ${values.reduce((a,b) => a + (b||0), 0).toFixed(3)}` },
      { type: 'card', title: 'Most Selling Product', size: 'small', value: mostSellingProductName }
    ]});

    // Items utilization (pie)
    itemsUtilization.push({ type: 'card', title: 'Most Utilized Item', size: 'small', value: itemsUtil.length ? `${itemsUtil[0].name} - ${itemsUtil[0].value}` : 'N/A', className: 'mt-3 mx-5' });
    itemsUtilization.push({
      type: 'chart',
      chartType: 'Pie (Item Utilization)',
      colClass: 'col-12 col-md-6',
      height: 420,
      options: {
        series: [{ name: 'Utilization', data: itemsUtil.map(i => ({ name: i.name, y: Number(i.value || 0) })) }],
        colors: ['#4e6e8e', '#7a9aa0', '#9aa3a8', '#c0c7ca']
      }
    });

    // Inventory by category (bar)
    const invByCat = Array.isArray(data.invByCat) ? data.invByCat : [];
    inventoryLevel.push({
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
    });

    // Transfers
    const transfers = data.transfers ?? { outgoing: 0, incoming: 0 };
    inventoryTransfers.push({ type: 'card', title: 'Number of Outgoing Transfers', size: 'small', value: String(transfers.outgoing ?? 0), colClass: 'col-12 col-md-4 offset-md-2' });
    inventoryTransfers.push({ type: 'card', title: 'Number of Incoming Transfers', size: 'small', value: String(transfers.incoming ?? 0), colClass: 'col-12 col-md-4' });
  }

  // Fallback static demo when loading or on error
  if (!data && !loading) {
    // simple empty states
  }

  return (
    <div className="container py-4">
      <PageHeader
        icon={<MdPieChart size={55} />}
        title="Store Dashboard"
        descriptionLines={["View overall of the store performance."]}
        actions={[]}
      />

      {loading && <div className="alert alert-info">Loading dashboard…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <Section title="Employee Performance" items={employeeSectionItems} />

      <Section title="Store Sales" items={storeSalesItems} />

      <Section title="Items Utilization in Recipes" items={itemsUtilization} />

      <Section title="Inventory Level by Category" items={inventoryLevel} />

      <Section title="Inventory Transfers during current quarter" items={inventoryTransfers} />
    </div>
  );
}