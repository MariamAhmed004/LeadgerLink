import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  StoresList.jsx
  - Uses /api/stores (now returns lightweight projection including managerName and operationalStatusName)
  - Uses /api/stores/operationalstatuses for filter select
  - Shows transient success alert when navigated back from create
*/

const DEFAULT_PAGE_SIZE = 10;

export default function StoresList() {
  const location = useLocation();
  const navigate = useNavigate();

  // flash success (when navigated back with state)
  const [success, setSuccess] = useState("");

  // filters / search
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  // data
  const [stores, setStores] = useState([]);
  const [statusOptions, setStatusOptions] = useState([{ label: "All", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // show success when navigated back with state { created: true, createdName }
  useEffect(() => {
    const state = location.state;
    if (state && state.created) {
      const name = state.createdName ?? "Store";
      setSuccess(`"${name}" created.`);
      // clear location state so refresh / navigation won't re-show the alert
      navigate(location.pathname, { replace: true, state: {} });
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // load stores and operational statuses
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // fetch stores (controller now returns projection with managerName and operationalStatusName)
        const res = await fetch("/api/stores", { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load stores");
        }
        const data = await res.json();
        if (!mounted) return;

        const arr = Array.isArray(data) ? data : (data.items || []);
        setStores(arr);

        // fetch operational statuses from stores controller endpoint
        try {
          const sres = await fetch("/api/stores/operationalstatuses", { credentials: "include" });
          if (sres.ok) {
            const sdata = await sres.json();
            if (mounted) {
              const opts = [
                { label: "All", value: "" },
                ...(Array.isArray(sdata)
                  ? sdata.map((s) => ({ label: s.operationalStatusName, value: String(s.operationalStatusId) }))
                  : []),
              ];
              setStatusOptions(opts);
            }
          } else {
            // fallback: derive from stores
            const fromStores = deriveStatusOptionsFromStores(arr);
            if (mounted) setStatusOptions(fromStores);
          }
        } catch {
          const fromStores = deriveStatusOptionsFromStores(arr);
          if (mounted) setStatusOptions(fromStores);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load stores");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const deriveStatusOptionsFromStores = (arr) => {
    const map = new Map();
    (arr || []).forEach((s) => {
      const id = String(s.operationalStatusId ?? s.operational_status_id ?? s.operationalStatus?.operationalStatusId ?? "");
      const name = s.operationalStatusName ?? s.operational_status_name ?? s.operationalStatus?.operationalStatusName ?? "";
      const key = id || name;
      if (key && !map.has(key)) map.set(key, { label: name || key, value: key });
    });
    return [{ label: "All", value: "" }, ...Array.from(map.values())];
  };

  // client-side filtering
  const filtered = (stores || []).filter((st) => {
    // status filter: compare by id or name
    if (statusFilter) {
      const stStatusId = String(st.operationalStatusId ?? st.operationalStatus?.operationalStatusId ?? "");
      const stStatusName = String(st.operationalStatusName ?? st.operationalStatus?.operationalStatusName ?? "");
      if (statusFilter !== stStatusId && statusFilter !== stStatusName) return false;
    }

    // search: store name, location, manager name
    if (searchTerm && String(searchTerm).trim() !== "") {
      const s = String(searchTerm).trim().toLowerCase();
      const name = String(st.storeName ?? "").toLowerCase();
      const locationField = String(st.location ?? "").toLowerCase();
      const manager = String(st.managerName ?? st.userName ?? "").toLowerCase();
      if (!(name.includes(s) || locationField.includes(s) || manager.includes(s))) return false;
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalEntries / entriesPerPage)), [totalEntries, entriesPerPage]);
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // map to EntityTable rows
  const tableRows = paged.map((st) => {
    const statusName = st.operationalStatusName ?? "-";
    const storeName = st.storeName ?? "-";
    const location = st.location ?? "-";
    const workingHours = st.workingHours ?? "-";
    const manager = st.managerName ?? st.userName ?? "-";

    const statusCell = <span className={`badge ${statusName && statusName.toLowerCase().includes("open") ? "bg-success" : "bg-secondary"}`}>{statusName}</span>;

    return [
      statusCell,
      storeName,
      location,
      workingHours,
      manager
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaPlus size={28} />}
        title="Stores"
        descriptionLines={[
          "Overview of stores. Use the status filter to narrow results.",
          "Click a store name to view details."
        ]}
        actions={[
          { icon: <FaPlus />, title: "New Store", route: "/stores/new" }
        ]}
      />

      {/* Success alert shown when navigated back after create */}
      {success && (
        <div className="mb-3">
          <div className="alert alert-success mb-0">{success}</div>
        </div>
      )}

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        searchPlaceholder="Search stores..."
        entriesValue={entriesPerPage}
        onEntriesChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}
      >
        <div className="col-md-4">
          <FilterSelect
            label="Operational Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            options={statusOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Stores"
        columns={["Status", "Store Name", "Location", "Working Hours", "Store Manager"]}
        rows={tableRows}
        emptyMessage={loading ? "Loading..." : (error ? `Error: ${error}` : "No stores to display.")}
        linkColumnName="Store Name"
        rowLink={(_, rowIndex) => {
          const st = paged[rowIndex];
          return `/stores/${st.storeId}`;
        }}
      />

      <PaginationSection
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        entriesPerPage={entriesPerPage}
        totalEntries={totalEntries}
      />
    </div>
  );
}