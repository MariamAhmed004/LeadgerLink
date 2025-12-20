import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";
import { HiOutlineDocumentSearch } from "react-icons/hi";

/*
  ApplicationAuditLogsList.jsx
  Summary:
  - Displays application-level audit logs with filters for action type and date range.
  - Fetches counts and paged overview from server endpoints and renders a paginated table.
*/

/* --------------------------------------------------
   STATE / CONSTANTS
   -------------------------------------------------- */
const DEFAULT_PAGE_SIZE = 10;

// Utility to pick first available field from a list of candidate keys
const getField = (o, ...keys) => {
  if (!o) return undefined;
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k];
  }
  return undefined;
};

// Map action names to Bootstrap badge classes (case-insensitive, substring match)
const getBadgeClassForAction = (actionName) => {
  if (!actionName) return "bg-secondary";
  const s = String(actionName).trim().toLowerCase();

  if (s.includes("create") || s.includes("created")) return "bg-success";
  if (s.includes("edit") || s.includes("update") || s.includes("modified")) return "bg-primary";
  if (s.includes("delete") || s.includes("removed") || s.includes("deleted")) return "bg-danger";
  if (s.includes("login")) return "bg-info";
  if (s.includes("logout")) return "bg-dark";
  // fallback for errors/exceptions
  if (s.includes("error") || s.includes("exception") || s.includes("failed")) return "bg-warning";

  return "bg-secondary";
};

export default function ApplicationAuditLogsList() {
  // --------------------------------------------------
  // LOCAL STATE
  // --------------------------------------------------
  // Filters: action type and date range
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Pagination state
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  // Data containers and UI flags
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [actionOptions, setActionOptions] = useState([{ label: "All", value: "" }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  // Build query string for overview endpoint
  const buildParams = (page, pageSize, actionName, fromDate, toDate) => {
    const qs = new URLSearchParams();
    qs.append("page", String(page));
    qs.append("pageSize", String(pageSize));
    if (actionName) qs.append("actionTypeName", actionName);
    if (fromDate) qs.append("from", fromDate);
    if (toDate) qs.append("to", toDate);
    return qs.toString();
  };

  // --------------------------------------------------
  // EFFECT: load action type options (used by filter)
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        // Load a chunk of overview items to derive available action types
        const res = await fetch("/api/auditlogs/overview?page=1&pageSize=50", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data.items || []);
        const set = new Set();
        (arr || []).forEach((it) => {
          const name = getField(it, "actionType", "ActionType") ?? "";
          if (name) set.add(name);
        });
        const opts = [{ label: "All", value: "" }, ...Array.from(set).map((s) => ({ label: s, value: s }))];
        setActionOptions(opts);
      } catch (ex) {
        // ignore lookup failures; options remain default
        console.error("Failed to load audit action types", ex);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // --------------------------------------------------
  // EFFECT: load count and paged overview whenever filters/paging change
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Build count query based on selected filters
        const countQs = new URLSearchParams();
        if (actionFilter) countQs.append("actionTypeName", actionFilter);
        if (from) countQs.append("from", from);
        if (to) countQs.append("to", to);

        // Request total count
        const countRes = await fetch(`/api/auditlogs/count?${countQs.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!countRes.ok) {
          const txt = await countRes.text().catch(() => "");
          throw new Error(txt || "Failed to get audit logs count");
        }
        const totalCount = await countRes.json();
        if (!mounted) return;
        setTotal(typeof totalCount === "number" ? totalCount : Number(totalCount) || 0);

        // Request overview page
        const qs = buildParams(currentPage, entriesPerPage, actionFilter, from, to);
        const res = await fetch(`/api/auditlogs/overview?${qs}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Failed to load audit logs");
        }
        const json = await res.json();
        if (!mounted) return;
        const items = Array.isArray(json) ? json : (json.items || json);
        setRows(items || []);
      } catch (ex) {
        if (ex.name !== "AbortError") {
          console.error(ex);
          if (mounted) setError(ex.message || "Failed to load audit logs");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [actionFilter, from, to, currentPage, entriesPerPage]);

  // Compute total pages for pagination
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / entriesPerPage)), [total, entriesPerPage]);

  // --------------------------------------------------
  // DATA MAPPING: build rows for EntityTable
  // --------------------------------------------------
  const tableRows = (rows || []).map((r) => {
    // Resolve fields from possibly mixed-case DTOs
    const status = getField(r, "actionType", "ActionType") ?? "-";
    const rawTimestamp = getField(r, "timestamp", "Timestamp");
    const timestamp = rawTimestamp ? new Date(rawTimestamp).toLocaleString() : "-";
    const user = getField(r, "userName", "UserName") ?? "-";
    const details = getField(r, "details", "Details") ?? "";

    // color-code badge based on action type
    const badgeClass = getBadgeClassForAction(status);

    // timestamp is plain value; EntityTable will make the cell a link via linkColumnName + rowLink
    return [
      <span className={`badge ${badgeClass}`} key="status">{status}</span>,
      timestamp,
      user,
      <pre key="details" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{details}</pre>
    ];
  });

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
              icon={<HiOutlineDocumentSearch size={55} />}
        title="Application Audit Logs"
        descriptionLines={[
            "Following are the LedgerLink application-level audit logs:",
          "Click on the timestamp to view the log details"
        ]}
        actions={[]}
      />

      <FilterSection
        searchValue={""}
        onSearchChange={() => {}}
        searchPlaceholder={""}
        entriesValue={entriesPerPage}
        onEntriesChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}
      >
        <div className="col-md-4">
          <FilterSelect
            label="Log Type"
            value={actionFilter}
            onChange={(v) => { setActionFilter(v); setCurrentPage(1); }}
            options={actionOptions}
          />
        </div>

        <div className="col-md-3">
          <FilterDate value={from} onChange={(v) => { setFrom(v); setCurrentPage(1); }} />
          <div className="small text-muted">From</div>
        </div>

        <div className="col-md-3">
          <FilterDate value={to} onChange={(v) => { setTo(v); setCurrentPage(1); }} />
          <div className="small text-muted">To</div>
        </div>
      </FilterSection>

      <EntityTable
        title="Application Audit Logs"
        columns={["Log Type", "Timestamp", "User", "Details"]}
        rows={tableRows}
        linkColumnName="Timestamp"
        rowLink={(_, rowIndex) => {
          const item = rows[rowIndex];
          const id = getField(item, "auditLogId", "AuditLogId", "audit_log_id");
          return id ? `/auditlogs/${id}` : null;
        }}
        emptyMessage={loading ? "Loading..." : (error ? `Error: ${error}` : "No audit logs to display.")}
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        entriesPerPage={entriesPerPage}
        totalEntries={total}
      />
    </div>
  );
}