import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";
import { HiOutlineDocumentSearch } from "react-icons/hi";
/*
  AuditLogView.jsx
  - Detail view for a single audit log.
  - Supports two modes:
    * Application audit log (default) -> header "View Application Audit Log"
      Shows audit fields + user name + role + organization.
    * Organization audit log (when ?organizationId or ?scope=org is present) -> header "View Organization Audit Log"
      Shows audit fields + user name + role + STORE name (if available) or falls back to organization name.
  - Uses endpoints:
    GET /api/auditlogs/{id}         -> returns AuditLogDto
    GET /api/users/{userId}         -> returns UserDetailDto (optional, for role/org/store)
    GET /api/stores/{id}            -> optional, to resolve store name if user provides storeId/storeName
*/

const fmtDate = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
  } catch {
    return String(v);
  }
};

export default function AuditLogView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // determine mode: organization if organizationId query param or scope=org provided
  const orgScope = Boolean(searchParams.get("organizationId") || (searchParams.get("scope") || "").toLowerCase() === "org");

  const [log, setLog] = useState(null);
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/auditlogs/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Audit log not found");
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load audit log (status ${res.status})`);
        }
        const dto = await res.json();
        if (!mounted) return;
        setLog(dto);

        // if audit log has a user, fetch the user detail to show role/org/store info
        const userId = dto?.userId;
        if (userId) {
          const uRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, { credentials: "include" });
          if (uRes.ok) {
            const uDto = await uRes.json();
            if (!mounted) return;
            setUser(uDto);

            // try to resolve store name if org-scoped and user includes storeId or storeName
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

  const headerTitle = orgScope ? "View Organization Audit Log" : "View Application Audit Log";
  const idVal = log ? (log.auditLogId ?? id) : id;
  const recordedAt = log ? fmtDate(log.timestamp ?? log.Timestamp) : "";

  const headerProps = {
      icon: <HiOutlineDocumentSearch size={55} />,
    title: headerTitle,
    descriptionLines: [log ? `${log.actionType ?? log.ActionType ?? ""}` : ""],
    actions: []
  };

  const actions = [
    { icon: <FaArrowLeft />, title: `Back to ${orgScope ? "Organization" : "Application"} Audit Logs`, onClick: () => navigate(orgScope ? "/organizationauditlogs" : "/applicationauditlogs") }
  ];

  const detailRows = log ? [
    { label: "Title", value: `Auditlog#${idVal} recorded at ${recordedAt}` },
    { label: "Action Type", value: log.actionType ?? log.ActionType ?? "" },
    { label: "Level", value: log.auditLogLevel ?? log.AuditLogLevel ?? "" },
    { label: "User", value: user ? (user.fullName ?? `${user.userFirstname ?? ""} ${user.userLastname ?? ""}`.trim()) : (log.userName ?? log.UserName ?? "—") },
    { label: "Role", value: user?.role ?? user?.Role ?? "—" },
    // organization vs store column
    { label: orgScope ? "Store" : "Organization", value: orgScope ? (storeName || user?.storeName || user?.StoreName || user?.organizationName || user?.OrganizationName || "—") : (user?.organizationName ?? user?.OrganizationName ?? "—") },
    { label: "Old Value", value: log.oldValue ?? log.OldValue ?? "" },
    { label: "New Value", value: log.newValue ?? log.NewValue ?? "" },
    { label: "Details", value: <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.details ?? log.Details ?? ""}</pre> }
  ] : [];

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