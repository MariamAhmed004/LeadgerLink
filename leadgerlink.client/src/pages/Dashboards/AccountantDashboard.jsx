import React, { useEffect, useState } from "react";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSelect from "../../components/Listing/FilterSelect";
import Section from "../../components/Dashboards/Section";
import DashboardCard from "../../components/Dashboards/DashboardCard";
import ChartWrapper from "../../components/Dashboards/ChartWrapper";
import HomePageTable from "../../components/homepages/HomePageTable";
import { MdPieChart } from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";

const calmPalette = ["#4e6e8e", "#7a9aa0", "#9aa3a8", "#c0c7ca"];

export default function AccountantDashboard() {
  const { loggedInUser } = useAuth();
  const orgId = loggedInUser?.OrgId ?? loggedInUser?.orgId ?? null;

  const [storeOptions, setStoreOptions] = useState([{ label: "All Branches (Aggregated)", value: "" }]);
  const [selectedStore, setSelectedStore] = useState("");
  const [loadingStores, setLoadingStores] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      setLoadingStores(true);
      try {
        let url = "/api/stores";
        if (orgId) url = `/api/stores/by-organization/${encodeURIComponent(orgId)}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load stores (${res.status})`);
        const json = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(json) ? json : (json.items || []);
        const opts = [{ label: "All Branches (Aggregated)", value: "" }, ...arr.map(s => ({ label: s.storeName || s.store_name || "Store", value: String(s.storeId ?? s.store_id ?? "") }))];
        setStoreOptions(opts);
      } catch (ex) {
        console.error("Failed to load stores", ex);
      } finally {
        if (mounted) setLoadingStores(false);
      }
    };

    loadStores();
    return () => { mounted = false; };
  }, [orgId]);

  // default load aggregated org summary
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      setData(null);
      try {
        const qs = selectedStore ? `storeId=${encodeURIComponent(selectedStore)}` : "";
        const url = qs ? `/api/dashboard/summary?months=6&topN=5&${qs}` : "/api/dashboard/summary?months=6&topN=5";
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }
        const json = await res.json();
        if (!mounted) return;
        setData(json);
      } catch (ex) {
        console.error("Failed to load dashboard data", ex);
        if (mounted) setError("Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [selectedStore]);

  // Build sections from data
  const financialItems = [];
  const inventoryItems = [];
  const salesItems = [];
  const contributionItems = [];
  const movementItems = [];

  if (data) {
    const salesSeries = data.salesSeries ?? { labels: [], values: [] };
    const values = Array.isArray(salesSeries.values) ? salesSeries.values.map(v => Number(v || 0)) : [];
    const totalSales = values.reduce((a, b) => a + (b || 0), 0);

    financialItems.push({ type: 'card', title: 'COGS (period)', size: 'small', value: 'BHD 0.000' });
    financialItems.push({ type: 'card', title: 'Gross Profit', size: 'small', value: 'BHD 0.000' });
    financialItems.push({ type: 'card', title: 'Total Sales (period)', size: 'small', value: `BHD ${totalSales.toFixed(3)}` });

    const invByCat = Array.isArray(data.invByCat) ? data.invByCat : [];
    inventoryItems.push({ type: 'card', title: 'Inventory Value', size: 'small', value: 'BHD 0.000' });
    inventoryItems.push({ type: 'chart', chartType: 'Bar (Inventory Value)', size: 'large', height: 320, options: {
      chart: { type: 'column' },
      xAxis: { categories: invByCat.map(i => i.name) },
      series: [{ name: 'Inventory', data: invByCat.map(i => Number(i.value || 0)) }],
      colors: [calmPalette[0]],
      legend: { enabled: false }
    }});

    const mostSellingProductName = data.mostSellingProductName ?? '-';
    salesItems.push({ type: 'card', title: 'Most Selling Product', size: 'small', value: mostSellingProductName, colClass: 'col-12 col-md-4' });
    salesItems.push({ type: 'chart', chartType: 'Line (Sales)', colClass: 'col-12', height: 340, options: {
      chart: { type: 'line' },
      xAxis: { categories: salesSeries.labels || [] },
      series: [{ name: 'Sales', data: values }],
      colors: [calmPalette[1]]
    }});

    // Contribution (if aggregated, could be per store share; here reuse invByCat as placeholder)
    contributionItems.push({ type: 'chart', chartType: 'Pie (Contribution)', colClass: 'col-12 col-md-6 offset-md-3', height: 380, options: {
      colors: calmPalette,
      series: [{ name: 'Share', data: invByCat.map(i => ({ name: i.name, y: Number(i.value || 0) })) }],
      legend: { enabled: true, layout: 'vertical', align: 'right', verticalAlign: 'middle' }
    }});

    const transfers = data.transfers ?? { outgoing: 0, incoming: 0 };
    movementItems.push({ type: 'card', title: 'Number of Pending Transfers', size: 'small', value: String(transfers.outgoing ?? 0), colClass: 'col-12 col-md-4 offset-md-2' });
    movementItems.push({ type: 'card', title: 'Number of Completed Transfers', size: 'small', value: String(transfers.incoming ?? 0), colClass: 'col-12 col-md-4' });
    movementItems.push({ type: 'chart', chartType: 'Bar (Inventory Movements)', colClass: 'col-12', height: 380, options: {
      series: [{ name: 'Movements', data: [Number(transfers.outgoing || 0), Number(transfers.incoming || 0)], color: calmPalette[2] }],
      legend: { enabled: false }
    }});
  }

  return (
    <div className="container py-4">
      <PageHeader
        icon={<MdPieChart size={55} />}
        title="Accountant Dashboard"
        descriptionLines={["Following overview of the organization stores details. Select a store to view its details or leave 'All Branches' for aggregated values."]}
        actions={[]}
      />

      <div className="row align-items-center my-3 mt-5 ">
        <div className="col-12 col-md-8 text-end">
          <h4 className="mb-0">Filter Details per Store</h4>
        </div>
        <div className="col-12 col-md-4 d-flex justify-content-md-start mt-4 ">
          <FilterSelect
            label=""
            value={selectedStore}
            onChange={(v) => setSelectedStore(v)}
            options={storeOptions}
            searchable={true}
          />
        </div>
      </div>

      {loading && <div className="alert alert-info">Loading dashboard…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <Section title="Financial Metrics" items={financialItems.length ? financialItems : [
        { type: 'card', title: 'COGS (Food Cost)', size: 'small', value: 'BHD 0.000' },
        { type: 'card', title: 'Gross Profit', size: 'small', value: 'BHD 0.000' },
        { type: 'card', title: 'Profit Margin (%)', size: 'small', value: '0%' }
      ]} />

      <Section title="Inventory" items={inventoryItems.length ? inventoryItems : [
        { type: 'card', title: 'Inventory Value', size: 'small', value: 'BHD 0.000' },
        { type: 'chart', chartType: 'Bar (Inventory Value)', size: 'large', height: 320, options: { series: [{ name: 'Inventory Value', data: [] }], legend: { enabled: false } } }
      ]} />

      <Section title="Sales" items={salesItems.length ? salesItems : [
        { type: 'card', title: 'Total Sales during Period', size: 'small', value: 'BHD 0.000', colClass: 'col-12 col-md-4 offset-md-2' },
        { type: 'card', title: 'Most Selling Product', size: 'small', value: '-', colClass: 'col-12 col-md-4' },
        { type: 'chart', chartType: 'Line (Sales)', colClass: 'col-12', height: 340, options: { series: [{ name: 'Sales', data: [] }], legend: { enabled: false } } }
      ]} />

      <hr />

      <Section title="Contribution" items={contributionItems.length ? contributionItems : [
        { type: 'chart', chartType: 'Pie (Contribution)', colClass: 'col-12 col-md-6 offset-md-3', height: 380, options: { series: [{ name: 'Share', data: [] }] } }
      ]} />

      <Section title="Inventory Movements" items={movementItems.length ? movementItems : [
        { type: 'card', title: 'Number of Pending Transfers', size: 'small', value: '0', colClass: 'col-12 col-md-4 offset-md-2' },
        { type: 'card', title: 'Number of Completed Transfers', size: 'small', value: '0', colClass: 'col-12 col-md-4' },
        { type: 'chart', chartType: 'Bar (Inventory Movements)', colClass: 'col-12', height: 380, options: { series: [{ name: 'Movements', data: [] }] } }
      ]} />

      <div className="mt-4">
        <HomePageTable
          title="Latest Inventory Movements"
          columns={["Requester", "Requested From", "Status", "Value"]}
          rows={[]}
          emptyMessage="No inventory movements to display."
        />
      </div>
    </div>
  );
}