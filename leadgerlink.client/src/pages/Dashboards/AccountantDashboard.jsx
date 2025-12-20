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

// Sentinel value for placeholder option
const PLACEHOLDER_VALUE = "__select_store__";

/*
  AccountantDashboard.jsx
  Displays an organization-level dashboard for accountants, including financial metrics, inventory, sales, store contribution, inventory movements, and latest inventory transfers.
*/


export default function AccountantDashboard() {

    // --------------------------------------------------
    // STATE DECLARATIONS
    // --------------------------------------------------

    // Auth and organization id
    const { loggedInUser } = useAuth();
    const orgId = loggedInUser?.OrgId ?? loggedInUser?.orgId ?? null;

    // Store filter options and selection
    const [storeOptions, setStoreOptions] = useState([
        { label: "Select a store to filter for", value: PLACEHOLDER_VALUE },
        { label: "All Branches (Aggregated)", value: "" },
    ]);
    const [selectedStore, setSelectedStore] = useState(PLACEHOLDER_VALUE);
    const [loadingStores, setLoadingStores] = useState(false);

    // Org-level and scoped dashboard data
    const [orgData, setOrgData] = useState(null);
    const [orgLoading, setOrgLoading] = useState(false);
    const [orgError, setOrgError] = useState("");

    const [scopedData, setScopedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Latest inventory movements table state
    const [latestMovements, setLatestMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);
    const [errorMovements, setErrorMovements] = useState("");

    // --------------------------------------------------
    // EFFECTS: DATA FETCHING
    // --------------------------------------------------

    // Load stores for filter dropdown
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
                const opts = [
                    { label: "Select a store to filter for", value: PLACEHOLDER_VALUE },
                    { label: "All Branches (Aggregated)", value: "" },
                    ...arr.map(s => ({ label: s.storeName || s.store_name || "Store", value: String(s.storeId ?? s.store_id ?? "") })),
                ];
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

    // Always load org-level summary (for Contribution + Inventory Movements)
    useEffect(() => {
        let mounted = true;
        const loadOrg = async () => {
            setOrgLoading(true);
            setOrgError("");
            try {
                const res = await fetch("/api/dashboard/summary?months=6&topN=5", { credentials: "include" });
                if (!res.ok) {
                    const txt = await res.text().catch(() => null);
                    throw new Error(txt || `Server returned ${res.status}`);
                }
                const json = await res.json();
                if (!mounted) return;
                setOrgData(json);
            } catch (ex) {
                console.error("Failed to load org dashboard data", ex);
                if (mounted) setOrgError("Failed to load organization dashboard data");
            } finally {
                if (mounted) setOrgLoading(false);
            }
        };
        loadOrg();
        return () => { mounted = false; };
    }, [orgId]);

    // Load scoped (store or aggregated) summary for other sections
    useEffect(() => {
        let mounted = true;
        const loadScoped = async () => {
            setLoading(true);
            setError("");
            setScopedData(null);
            try {
                const hasStoreFilter = !!selectedStore && selectedStore !== PLACEHOLDER_VALUE;
                const qs = hasStoreFilter && selectedStore !== "" ? `storeId=${encodeURIComponent(selectedStore)}` : "";
                const url = qs ? `/api/dashboard/summary?months=6&topN=5&${qs}` : "/api/dashboard/summary?months=6&topN=5";
                const res = await fetch(url, { credentials: "include" });
                if (!res.ok) {
                    const txt = await res.text().catch(() => null);
                    throw new Error(txt || `Server returned ${res.status}`);
                }
                const json = await res.json();
                if (!mounted) return;
                setScopedData(json);
            } catch (ex) {
                console.error("Failed to load dashboard data", ex);
                if (mounted) setError("Failed to load dashboard data");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadScoped();
        return () => { mounted = false; };
    }, [selectedStore]);

    // Fetch latest inventory movements for organization
    useEffect(() => {
        if (!orgId) return;
        let mounted = true;
        const fetchLatestMovements = async () => {
            setLoadingMovements(true);
            setErrorMovements("");
            try {
                const res = await fetch(`/api/inventorytransfers/latest-for-organization?organizationId=${encodeURIComponent(orgId)}`, { credentials: "include" });
                if (!res.ok) throw new Error(`Failed to load latest inventory movements (${res.status})`);
                const json = await res.json();
                if (!mounted) return;
                setLatestMovements(Array.isArray(json) ? json : []);
            } catch (ex) {
                if (mounted) setErrorMovements("Failed to load latest inventory movements");
            } finally {
                if (mounted) setLoadingMovements(false);
            }
        };
        fetchLatestMovements();
        return () => { mounted = false; };
    }, [orgId]);

    // --------------------------------------------------
    // DATA PROCESSING: BUILD DASHBOARD SECTIONS
    // --------------------------------------------------

    // Section arrays for dashboard cards/charts
    const financialItems = [];
    const inventoryItems = [];
    const salesItems = [];
    const contributionItems = [];
    const movementItems = [];

    // Use scopedData for financial, inventory and sales
    if (scopedData) {
        // Sales series and totals
        const salesSeries = scopedData.salesSeries ?? { labels: [], values: [] };
        const values = Array.isArray(salesSeries.values) ? salesSeries.values.map(v => Number(v || 0)) : [];
        const totalSales = values.reduce((a, b) => a + (b || 0), 0);

        // Financial metrics
        const cogs = Number(scopedData.cogs || 0);
        const grossProfit = Number(scopedData.grossProfit || 0);
        const inventoryValue = Number(scopedData.inventoryValue || 0);

        financialItems.push({ type: 'card', title: 'COGS (period)', size: 'small', value: `BHD ${cogs.toFixed(3)}` });
        financialItems.push({ type: 'card', title: 'Gross Profit (period)', size: 'small', value: `BHD ${grossProfit.toFixed(3)}` });
        financialItems.push({ type: 'card', title: 'Total Sales (period)', size: 'small', value: `BHD ${totalSales.toFixed(3)}` });

        // Inventory by category chart
        const invByCatScoped = Array.isArray(scopedData.invByCat) ? scopedData.invByCat : [];
        inventoryItems.push({ type: 'card', title: 'Inventory Value', size: 'small', value: `BHD ${inventoryValue.toFixed(3)}` });
        inventoryItems.push({
            type: 'chart',
            chartType: 'Bar (Inventory Value)',
            size: 'large',
            height: 320,
            options: {
                chart: { type: 'column' },
                xAxis: { categories: invByCatScoped.map(i => i.name) },
                series: [{ name: 'Inventory', data: invByCatScoped.map(i => Number(i.value || 0)) }],
                colors: [calmPalette[0]],
                legend: { enabled: false }
            }
        });

        // Most selling product and sales chart
        const mostSellingProductName = scopedData.mostSellingProductName ?? '-';
        salesItems.push({ type: 'card', title: 'Most Selling Product', size: 'small', value: mostSellingProductName, colClass: 'col-12 col-md-4' });
        salesItems.push({
            type: 'chart',
            chartType: 'Line (Sales)',
            colClass: 'col-12',
            height: 340,
            options: {
                chart: { type: 'line' },
                xAxis: { categories: salesSeries.labels || [] },
                series: [{ name: 'Sales', data: values }],
                colors: [calmPalette[1]]
            }
        });
    }

    // Use orgData for Contribution and Inventory Movements (unaffected by filtering)
    const contributionData = Array.isArray(orgData?.salesContributionByStore) ? orgData.salesContributionByStore : [];
    contributionItems.push({
        type: 'chart',
        chartType: 'Pie (Contribution)',
        colClass: 'col-12 col-md-6 offset-md-3',
        height: 450,
        options: {
            colors: calmPalette,
            series: [{
                name: 'Sales Share',
                data: contributionData.map(i => ({ name: i.name, y: Number(i.value || 0) }))
            }]
            , legend: {
                enabled: true,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                itemMarginTop: 2,
                itemStyle: { fontSize: "12px" }
            }
        }
    });

    // Inventory movements cards and chart
    const transfersOrg = orgData?.transfers ?? { outgoing: 0, incoming: 0 };
    movementItems.push({ type: 'card', title: 'Number of Pending Transfers', size: 'small', value: String(transfersOrg.pending ?? 0), colClass: 'col-12 col-md-4 offset-md-2' });
    movementItems.push({ type: 'card', title: 'Number of Completed Transfers', size: 'small', value: String(transfersOrg.completed ?? 0), colClass: 'col-12 col-md-4' });
    movementItems.push({
        type: 'chart',
        chartType: 'Bar (Inventory Movements)',
        colClass: 'col-12',
        height: 380,
        options: {
            xAxis: { categories: ['In-Process', 'Completed'] },
            series: [{ name: 'Movements', data: [Number(transfersOrg.pending || 0), Number(transfersOrg.completed || 0)], color: calmPalette[2] }],
            legend: { enabled: false }
        }
    });

    const anyLoading = loading || orgLoading;
    const anyError = error || orgError;

    // --------------------------------------------------
    // RENDER DASHBOARD SECTIONS
    // --------------------------------------------------
    return (
        <div className="container py-4">
            <PageHeader
                icon={<MdPieChart size={55} />}
                title="Organization Dashboard"
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

            {anyLoading && <div className="alert alert-info">Loading dashboard...</div>}
            {anyError && <div className="alert alert-danger">{anyError}</div>}

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

            {/* Always org-level */}
            <Section title="Stores Sales Contribution" items={contributionItems} />

            {/* Always org-level */}
            <Section title="Inventory Movements" items={movementItems} />

            <div className="mt-4">
                <HomePageTable
                    title="Latest Inventory Movements"
                    columns={["Requester", "Requested From", "Status"]}
                    rows={latestMovements.map(m => [m.requester, m.fromStore, m.status])}
                    emptyMessage={loadingMovements ? "Loading..." : "No inventory movements to display."}
                />
                {errorMovements && <div className="alert alert-danger mt-2">{errorMovements}</div>}
            </div>
        </div>
    );

}