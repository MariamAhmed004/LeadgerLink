import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { useAuth } from "../../Context/AuthContext";
/*
  AuditLogView.jsx
  Summary:
  - Displays details for a single audit log entry.
  - Loads the audit log DTO and optionally related user and store information
    and renders a detailed table with metadata and navigation actions.
*/

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
const fmtDate = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
  } catch {
    return String(v);
  }
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function AuditLogView() {
  // route / query helpers
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // --------------------------------------------------
  // MODE: determine organization scope from query
  // --------------------------------------------------
  // treat as organization-scoped view when organizationId or scope=org present
  const orgScope = Boolean(searchParams.get("organizationId") || (searchParams.get("scope") || "").toLowerCase() === "org");

  // --------------------------------------------------
  // STATE: data and UI flags
  // --------------------------------------------------
  // loaded audit log DTO
  const [log, setLog] = useState(null);
  // optional related user DTO
  const [user, setUser] = useState(null);
  // resolved store name for organization-scoped logs
  const [storeName, setStoreName] = useState("");
  // loading / error UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // EFFECT: load audit log and related lookups
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // fetch audit log by id
        const res = await fetch(`/api/auditlogs/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Audit log not found");
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load audit log (status ${res.status})`);
        }
        const dto = await res.json();
        if (!mounted) return;
        setLog(dto);

        // if audit log references a user, fetch user details to display role/org/store info
        const userId = dto?.userId;
        if (userId) {
          const uRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, { credentials: "include" });
          if (uRes.ok) {
            const uDto = await uRes.json();
            if (!mounted) return;
            setUser(uDto);

            // when org-scoped, attempt to resolve store name via user or store endpoint
            const sId = uDto?.storeId ?? uDto?.StoreId ?? null;
            const sName = uDto?.storeName ?? uDto?.StoreName ?? null;
            if (orgScope) {
              if (sName) {
                setStoreName(sName);
              } else if (sId) {
                const sRes = await fetch(`/api/stores/${encodeURIComponent(sId)}`, { credentials: "include" });
                if (sRes.ok) {
                  const sDto = await sRes.json();
                  if (mounted) setStoreName(sDto?.storeName ?? sDto?.StoreName ?? "");
                }
              }
            }
          }
        }
      } catch (ex) {
        console.error(ex);
        if (mounted) setError(ex?.message || "Failed to load audit log");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id, orgScope]);

  // --------------------------------------------------
  // ROLE / HEADER: compute title and navigation behavior
  // --------------------------------------------------
  // role flags derived from auth context
  const isOrgAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Organization Admin");
  const isAppAdmin = loggedInUser && Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes("Application Admin");

  // header title varies by role and scope
  const headerTitle = isOrgAdmin ? "View Organization Audit Log" : (isAppAdmin ? "View Application Audit Log" : (orgScope ? "View Organization Audit Log" : "View Application Audit Log"));
  const idVal = log ? (log.auditLogId ?? id) : id;
  const recordedAt = log ? fmtDate(log.timestamp ?? log.Timestamp) : "";

  const headerProps = {
      icon: <HiOutlineDocumentSearch size={55} />,
    title: headerTitle,
    descriptionLines: "",
    actions: []
  };

  // decide back navigation target based on role or scope
  const backToOrg = isOrgAdmin ? true : (isAppAdmin ? false : orgScope);
  const actions = [
    { icon: <FaArrowLeft />, title: `Back to ${backToOrg ? "Organization" : "Application"} Audit Logs`, onClick: () => navigate(backToOrg ? "/organizationauditlogs" : "/applicationauditlogs") }
  ];

  // --------------------------------------------------
  // DETAIL ROWS: assemble rows for DetailTable
  // --------------------------------------------------
  const detailRows = log ? [
    { label: "Title", value: `Auditlog#${idVal} recorded at ${recordedAt}` },
    { label: "Action Type", value: log.actionType ?? log.ActionType ?? "" },
    { label: "Level", value: log.auditLogLevel ?? log.AuditLogLevel ?? "" },
    { label: "User", value: user ? (user.fullName ?? `${user.userFirstname ?? ""} ${user.userLastname ?? ""}`.trim()) : (log.userName ?? log.UserName ?? "none") },
    { label: "Role", value: user?.role ?? user?.Role ?? "none" },
    // organization vs store column (unchanged; still driven by orgScope)
    { label: orgScope ? "Store" : "Organization", value: orgScope ? (storeName || user?.storeName || user?.StoreName || user?.organizationName || user?.OrganizationName || "none") : (user?.organizationName ?? user?.OrganizationName ?? "none") },
    { label: "Old Value", value: log.oldValue ?? log.OldValue ?? "" },
    { label: "New Value", value: log.newValue ?? log.NewValue ?? "" },
    { label: "Details", value: <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.details ?? log.Details ?? ""}</pre> }
  ] : [];

  // --------------------------------------------------
  // RENDER / ERROR STATES
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader {...headerProps} actions={[]} />

      <div className="row gx-4 gy-4">
        <div className="col-12">
          {loading ? (
            <div>Loading audit log...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <DetailTable title={`auditlog#${idVal} recorded at ${recordedAt}`} rows={detailRows} />
          )}
        </div>

        <div className="col-12 d-flex justify-content-center">
          <DetailPageAction actions={actions} orientation="horizontal" align="end" />
        </div>
      </div>
    </div>
  );
}