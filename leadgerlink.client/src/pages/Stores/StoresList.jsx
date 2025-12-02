import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { Link } from "react-router-dom";

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  StoresList.jsx
  - Lists stores with status filter, paging and overview columns:
    Status (operational status), Store Name, Location, Working Hours, Store Manager
  - Uses existing listing components to match app style.
  - Attempts to fetch operational statuses from /api/operationalstatuses,
    falls back to deriving options from returned stores.
*/

const DEFAULT_PAGE_SIZE = 10;

export default function StoresList() {
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

  // load stores and operational statuses
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // fetch stores
        const res = await fetch("/api/stores", { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load stores");
        }
        const data = await res.json();
        if (!mounted) return;

        const arr = Array.isArray(data) ? data : (data.items || []);
        setStores(arr);

        // try to fetch operational statuses (best-effort)
        try {
          const sres = await fetch("/api/operationalstatuses", { credentials: "include" });
          if (sres.ok) {
            const sdata = await sres.json();
            if (mounted) {
              const opts = [
                { label: "All", value: "" },
                ...(Array.isArray(sdata)
                  ? sdata.map((s) => ({ label: s.operationalStatusName ?? s.OperationalStatusName ?? s.operational_status_name ?? s.name ?? String(s), value: String(s.operationalStatusId ?? s.OperationalStatusId ?? s.operational_status_id ?? s.id ?? "") }))
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
      const id = String(s.operationalStatus?.operationalStatusId ?? s.OperationalStatus?.OperationalStatusId ?? s.operationalStatusId ?? s.OperationalStatusId ?? s.operational_status_id ?? "");
      const name = s.operationalStatus?.operationalStatusName ?? s.OperationalStatus?.OperationalStatusName ?? s.operationalStatusName ?? s.operational_status_name ?? s.operationalStatus ?? "";
      const key = id || name;
      if (key && !map.has(key)) map.set(key, { label: name || key, value: key });
    });
    return [{ label: "All", value: "" }, ...Array.from(map.values())];
  };

  // helper to flexibly read fields with different naming conventions
  const getField = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  // client-side filtering
  const filtered = (stores || []).filter((st) => {
    // status filter: compare by id or name
    if (statusFilter) {
      const stStatusId = String(getField(st, "operationalStatusId", "OperationalStatusId", "operational_status_id") ?? "");
      const stStatusName = String(getField(st, "operationalStatus")?.operationalStatusName ?? getField(st, "operationalStatusName") ?? getField(st, "OperationalStatusName") ?? "");
      if (statusFilter !== stStatusId && statusFilter !== stStatusName) return false;
    }

    // search: store name, location, manager name
    if (searchTerm && String(searchTerm).trim() !== "") {
      const s = String(searchTerm).trim().toLowerCase();
      const name = String(getField(st, "storeName", "StoreName", "store_name", "name") ?? "").toLowerCase();
      const location = String(getField(st, "location", "Location") ?? "").toLowerCase();
      const manager = String(getField(st, "user")?.userFirstname ? `${getField(st, "user").userFirstname} ${getField(st, "user").userLastname}` : getField(st, "managerName") ?? getField(st, "manager") ?? "" ).toLowerCase();
      if (!(name.includes(s) || location.includes(s) || manager.includes(s))) return false;
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalEntries / entriesPerPage)), [totalEntries, entriesPerPage]);
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // map to EntityTable rows
  const tableRows = paged.map((st) => {
    const id = getField(st, "storeId", "StoreId", "id");
    const statusName = getField(st, "operationalStatus")?.operationalStatusName ?? getField(st, "operationalStatusName") ?? getField(st, "OperationalStatusName") ?? "-";
    const storeName = getField(st, "storeName", "StoreName", "store_name", "name") ?? "-";
    const location = getField(st, "location", "Location") ?? "-";
    const workingHours = getField(st, "workingHours", "WorkingHours") ?? "-";

    // manager name: try nested user, fallback to user fields
    const manager =
      (st.user && (st.user.userFirstname || st.user.userLastname))
        ? `${getField(st.user, "userFirstname") ?? ""} ${getField(st.user, "userLastname") ?? ""}`.trim()
        : getField(st, "managerName") ?? getField(st, "manager") ?? "-";

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
          const id = getField(st, "storeId", "StoreId", "id");
          return `/stores/${id}`;
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