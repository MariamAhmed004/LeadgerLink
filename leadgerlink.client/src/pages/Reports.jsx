import React, { useState } from "react";
import { FaFileAlt, FaInfoCircle } from "react-icons/fa";
import PageHeader from "../components/Listing/PageHeader";
import EntityTable from "../components/Listing/EntityTable";
import InfoModal from "../components/Ui/InfoModal";
import { useAuth } from "../Context/AuthContext";

/*
  Reports.jsx
  - Role-filtered report generation UI.
  - Uses backend endpoint: GET /api/reports/generate?reportId=...&format=...(&organizationId=...&storeId=...)
  - Passes org/store context from loggedInUser so server can scope the placeholder file.
  - Download logic reads response blob and triggers browser save.
*/

const REPORTS_CONFIG = [
  // Store Manager reports (PDF + Excel)
  { id: "current_stock", name: "Current Stock", allowedRoles: ["Store Manager"], formats: ["PDF", "Excel"], description: "Current stock snapshot for your store, grouped by item and location." },
  { id: "top_recipes_and_sales", name: "Top Recipes & Sales", allowedRoles: ["Store Manager"], formats: ["PDF", "Excel"], description: "Top performing recipes by volume and value for the selected period." },
  { id: "top_employee", name: "Top Employee", allowedRoles: ["Store Manager"], formats: ["PDF", "Excel"], description: "Employee sales leaderboard for the selected store and period." },
  { id: "sales_summary", name: "Daily/Monthly Sales Summary", allowedRoles: ["Store Manager"], formats: ["PDF", "Excel"], description: "Sales aggregates by day or month for the selected store." },
  { id: "inventory_usage_trends", name: "Inventory Usage Trends", allowedRoles: ["Store Manager"], formats: ["PDF", "Excel"], description: "Usage trends for inventory items (consumption over time)." },

  // Organization Accountant reports (Excel + PDF; Inventory Valuation Excel-only)
  { id: "monthly_cogs", name: "Monthly COGS", allowedRoles: ["Organization Accountant"], formats: ["Excel", "PDF"], description: "Cost of goods sold for the selected organization and month." },
  { id: "gross_profit_and_margin", name: "Gross Profit & Profit Margin", allowedRoles: ["Organization Accountant"], formats: ["Excel", "PDF"], description: "Gross profit and margin calculations for reporting period." },
  { id: "inventory_valuation", name: "Inventory Valuation", allowedRoles: ["Organization Accountant"], formats: ["Excel"], description: "Inventory valuation report using configured costing method (Excel only)." },
  { id: "sales_by_recipe", name: "Sales Summary by Recipe", allowedRoles: ["Organization Accountant"], formats: ["Excel", "PDF"], description: "Sales aggregated by recipe to help finance reconcile costs." },
  { id: "monthly_sales", name: "Monthly Sales", allowedRoles: ["Organization Accountant"], formats: ["Excel", "PDF"], description: "Organization-level monthly sales summary." },

  // Organization Administrator (Operational) reports (Excel + PDF)
  { id: "top_performing_store", name: "Top Performing Store", allowedRoles: ["Organization Admin"], formats: ["Excel", "PDF"], description: "Ranked list of stores by revenue/performance for the period." },
  { id: "employee_sales_performance", name: "Employee Sales Performance", allowedRoles: ["Organization Admin"], formats: ["Excel", "PDF"], description: "Sales and KPI metrics per employee across the organization." },
  { id: "low_stock_alerts", name: "Low Stock Alerts", allowedRoles: ["Organization Admin"], formats: ["Excel", "PDF"], description: "Current low-stock items across stores to prioritize restocking." },
  { id: "inventory_utilization", name: "Inventory Utilization", allowedRoles: ["Organization Admin"], formats: ["Excel", "PDF"], description: "Utilization rates of inventory items across stores / time." },
  { id: "sales_per_store_month", name: "Sales per Store / Month", allowedRoles: ["Organization Admin"], formats: ["Excel", "PDF"], description: "Matrix of monthly sales per store used for operational planning." }
];

export default function Reports() {
  const { loggedInUser } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState("");

  // visible reports based on current user's roles (case-insensitive)
  const userRoles = (loggedInUser?.roles || []).map(r => String(r || "").trim().toLowerCase());
  const visibleReports = REPORTS_CONFIG.filter(r => (r.allowedRoles || []).some(ar => userRoles.includes(String(ar || "").trim().toLowerCase())));

  const openInfo = (report) => { setSelected(report); setShowInfo(true); };
  const closeInfo = () => { setShowInfo(false); setSelected(null); };

  // Download helper uses endpoint and includes optional org/store from auth context
  const downloadReport = async (reportId, format) => {
    setError("");
    const key = `${reportId}:${format}`;
    setDownloading(key);
    try {
      // include organizationId / storeId if available in auth context so backend can scope placeholder
      const orgId = loggedInUser?.OrgId ?? loggedInUser?.orgId ?? null;
      const storeId = loggedInUser?.StoreId ?? loggedInUser?.storeId ?? null;

      const qs = new URLSearchParams({ reportId, format: format }).toString();
      // append org/store if present
      const extra = new URLSearchParams();
      if (orgId) extra.append("organizationId", String(orgId));
      if (storeId) extra.append("storeId", String(storeId));
      const url = extra.toString() ? `/api/reports/generate?${qs}&${extra.toString()}` : `/api/reports/generate?${qs}`;

      const res = await fetch(url, { method: "GET", credentials: "include" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)["']?/.exec(cd);
      const filename = match ? decodeURIComponent(match[1]) : `${reportId}.${format === "Excel" ? "xlsx" : format.toLowerCase()}`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (ex) {
      console.error("Download failed", ex);
      setError(ex?.message || "Failed to download report");
    } finally {
      setDownloading(null);
    }
  };

  const columns = ["Info", "Report", "Formats Available"];
  const tableRows = visibleReports.map(r => {
    const infoCell = (
      <button type="button" className="btn btn-link p-0" aria-label={`Info ${r.name}`} onClick={(e) => { e.preventDefault(); openInfo(r); }}>
        <FaInfoCircle size={20} color="#6c757d" />
      </button>
    );
    const reportCell = <span className="text-decoration-underline">{r.name}</span>;
    const formatButtons = r.formats.map(f => {
      const cls = f === "PDF" ? "btn-danger" : "btn-success";
      const btnKey = `${r.id}:${f}`;
      const busy = downloading === btnKey;
      return (
        <button key={btnKey} type="button" className={`btn ${cls} btn-sm me-2`} style={{ minWidth: 64 }} onClick={() => downloadReport(r.id, f)} disabled={!!downloading}>
          {busy ? "Downloading..." : f}
        </button>
      );
    });
    return [infoCell, reportCell, <div>{formatButtons}</div>];
  });

  return (
    <div className="container py-5">
      <PageHeader icon={<FaFileAlt size={28} />} title="Reports Generation" descriptionLines={["Following are all reports that you can generate from LedgerLink:", "Click on the format of the report you want to generate"]} actions={[]} />

      {error && <div className="alert alert-danger my-3">{error}</div>}

      {visibleReports.length === 0 ? (
        <div className="alert alert-info">No reports available for your role.</div>
      ) : (
        <EntityTable title="Available Reports" columns={columns} rows={tableRows} emptyMessage="No reports available." linkColumnName="Report" />
      )}

      <InfoModal show={showInfo} title={selected ? selected.name : "Report info"} onClose={closeInfo}>
        <p className="mb-2">{selected?.description}</p>
        <div><strong>Formats:</strong> {(selected?.formats || []).map(f => <span key={f} className="badge bg-secondary me-2">{f}</span>)}</div>

      </InfoModal>
    </div>
  );
}