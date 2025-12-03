import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  ApplicationAuditLogsList.jsx
  - Uses /api/auditlogs/overview and /api/auditlogs/count.
  - Filters: action type (status) and timestamp range (from/to).
  - Table columns: Status, Timestamp (navigates to details via EntityTable rowLink), User, Details.
*/

const DEFAULT_PAGE_SIZE = 10;

const getField = (o, ...keys) => {
  if (!o) return undefined;
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k];
  }
  return undefined;
};

export default function ApplicationAuditLogsList() {
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [actionOptions, setActionOptions] = useState([{ label: "All", value: "" }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // build query params helper
  const buildParams = (page, pageSize, actionName, fromDate, toDate) => {
    const qs = new URLSearchParams();
    qs.append("page", String(page));
    qs.append("pageSize", String(pageSize));
    if (actionName) qs.append("actionTypeName", actionName);
    if (fromDate) qs.append("from", fromDate);
    if (toDate) qs.append("to", toDate);
    return qs.toString();
  };

  // load action type options (derive from first N overview items)
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
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

  // load count & paged overview whenever filters / paging change
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const countQs = new URLSearchParams();
        if (actionFilter) countQs.append("actionTypeName", actionFilter);
        if (from) countQs.append("from", from);
        if (to) countQs.append("to", to);

        // count
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

        // overview page
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / entriesPerPage)), [total, entriesPerPage]);

  const tableRows = (rows || []).map((r) => {
    const status = getField(r, "actionType", "ActionType") ?? "-";
    const rawTimestamp = getField(r, "timestamp", "Timestamp");
    const timestamp = rawTimestamp ? new Date(rawTimestamp).toLocaleString() : "-";
    const user = getField(r, "userName", "UserName") ?? "-";
    const details = getField(r, "details", "Details") ?? "";

    // timestamp is plain value; EntityTable will make the cell a link via linkColumnName + rowLink
    return [
      <span className="badge bg-secondary" key="status">{status}</span>,
      timestamp,
      user,
      <pre key="details" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{details}</pre>
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={null}
        title="Application Audit Logs"
        descriptionLines={[
          "Application-level audit logs. Use filters to narrow results by action and time range.",
        ]}
        actions={[]}
      />

      <FilterSection
        searchValue={""}
        onSearchChange={() => {}}
        searchPlaceholder=""
        entriesValue={entriesPerPage}
        onEntriesChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}
      >
        <div className="col-md-4">
          <FilterSelect
            label="Status"
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
        columns={["Status", "Timestamp", "User", "Details"]}
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