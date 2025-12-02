import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useAuth } from "../../Context/AuthContext";

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  UsersList.jsx
  - Uses existing listing components (PageHeader, FilterSection, FilterSelect, FilterDate,
    EntityTable, PaginationSection).
  - Fetches users + lookups (stores, organizations) and performs client-side filtering,
    role-specific column rendering and paging.
  - Clicking a user row navigates to the user's detail view (NOT edit).
*/

const DEFAULT_PAGE_SIZE = 10;

export default function UsersList() {
  const { loggedInUser } = useAuth();

  // filters / search
  const [statusFilter, setStatusFilter] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  // data
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // load users + lookups
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Try endpoint that returns all users; fall back to paged endpoint if needed
        const endpoints = ["/api/users/all", "/api/users"];
        let usersData = null;
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, { credentials: "include" });
            if (!res.ok) continue;
            const json = await res.json();
            // support either array or { items, total }
            usersData = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : json);
            break;
          } catch {
            // try next
          }
        }

        if (!mounted) return;

        setUsers(Array.isArray(usersData) ? usersData : []);

        // lookups: stores and organizations, best-effort (ignore failures)
        try {
          const [storesRes, orgsRes] = await Promise.all([
            fetch("/api/stores", { credentials: "include" }),
            fetch("/api/organizations", { credentials: "include" }),
          ]);

          if (storesRes.ok) {
            const sjson = await storesRes.json();
            if (mounted) setStores(Array.isArray(sjson) ? sjson : (sjson.items || []));
          }

          if (orgsRes.ok) {
            const ojson = await orgsRes.json();
            if (mounted) setOrganizations(Array.isArray(ojson) ? ojson : (ojson.items || []));
          }
        } catch {
          // ignore lookup failures
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // helpers to read common fields with varied casing
  const getField = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  // role checks
  const isAppAdmin = loggedInUser?.roles?.includes("Application Admin");
  const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
  const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
  const isStoreManager = loggedInUser?.roles?.includes("Store Manager");

  // client-side filtering
  const filtered = users.filter((u) => {
    // status filter
    const isActive = Boolean(getField(u, "isActive", "IsActive", "active", "Active"));
    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "inactive" && isActive) return false;

    // createdAfter filter (active by date)
    if (createdAfter) {
      const createdAt = getField(u, "createdAt", "CreatedAt", "created_at", "Created");
      if (!createdAt) return false;
      const createdDate = new Date(createdAt);
      const afterDate = new Date(createdAfter);
      if (!(createdDate >= afterDate)) return false;
    }

    // search: name, email, phone, role
    if (searchTerm && String(searchTerm).trim() !== "") {
      const s = String(searchTerm).trim().toLowerCase();
      const fullName =
        String(getField(u, "fullName", "FullName", "name", "Name",
          (getField(u, "userFirstname") ? `${getField(u, "userFirstname")} ${getField(u, "userLastname")}` : undefined)) ?? "").toLowerCase();
      const email = String(getField(u, "email", "Email") ?? "").toLowerCase();
      const phone = String(getField(u, "phone", "Phone") ?? "").toLowerCase();
      const role = String(getField(u, "role", "Role") ?? "").toLowerCase();

      if (!(fullName.includes(s) || email.includes(s) || phone.includes(s) || role.includes(s))) return false;
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalEntries / entriesPerPage)), [totalEntries, entriesPerPage]);
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // lookup helpers
  const findStoreName = (id) => {
    const s = stores.find((x) => String(getField(x, "storeId", "StoreId", "id") ?? "") === String(id ?? ""));
    return s ? (getField(s, "storeName", "StoreName", "name") ?? "") : "";
  };
  const findOrgName = (id) => {
    const o = organizations.find((x) => String(getField(x, "orgId", "OrgId", "id") ?? "") === String(id ?? ""));
    return o ? (getField(o, "orgName", "OrgName", "org_name", "name") ?? "") : "";
  };

  // build rows according to role
  const tableRows = paged.map((u) => {
    const id = getField(u, "userId", "UserId", "id", "Id");
    const fullName =
      getField(u, "fullName", "FullName") ??
      (getField(u, "userFirstname") ? `${getField(u, "userFirstname")} ${getField(u, "userLastname")}` : undefined) ??
      getField(u, "name", "Name") ??
      "-";
    const email = getField(u, "email", "Email") ?? "";
    const phone = getField(u, "phone", "Phone") ?? getField(u, "phoneNumber", "PhoneNumber") ?? "";
    const role = getField(u, "role", "Role") ?? getField(u, "userRole", "UserRole") ?? "";
    const orgId = getField(u, "orgId", "OrgId", "organizationId", "OrganizationId");
    const storeId = getField(u, "storeId", "StoreId");
    const createdAt = getField(u, "createdAt", "CreatedAt", "created_at");

    const statusCell = (getField(u, "isActive", "IsActive") === true || getField(u, "active") === true)
      ? <span className="badge bg-success">Active</span>
      : <span className="badge bg-secondary">Inactive</span>;

    if (isAppAdmin) {
      return [
        statusCell,
        fullName,
        findOrgName(orgId) || "-",
        role || "-",
        email || "-"
      ];
    }

    if (isOrgAdmin || isOrgAccountant) {
      return [
        statusCell,
        fullName,
        findStoreName(storeId) || "-",
        role || "-",
        email || "-"
      ];
    }

    if (isStoreManager) {
      return [
        statusCell,
        fullName,
        email || "-",
        phone || "-",
        createdAt ? new Date(createdAt).toLocaleString() : "-"
      ];
    }

    // default for other roles: show a compact view similar to org admin
    return [
      statusCell,
      fullName,
      role || "-",
      email || "-"
    ];
  });

  // Build columns dynamically to match rows above
  const columns = (() => {
    if (isAppAdmin) return ["Status", "User Fullname", "Organization", "Role", "Email"];
    if (isOrgAdmin || isOrgAccountant) return ["Status", "User Fullname", "Store", "Role", "Email"];
    if (isStoreManager) return ["Status", "User Fullname", "Email", "Phone", "Created At"];
    return ["Status", "User Fullname", "Role", "Email"];
  })();

  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }

  function handlePerPageChange(e) {
    setEntriesPerPage(Number(e.target.value) || DEFAULT_PAGE_SIZE);
    setCurrentPage(1);
  }

  async function handleDelete(userId) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(userId);

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      // Optimistic update
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setCurrentPage(1);
    } catch (err) {
      window.alert(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaPlus size={28} />}
        title="Users"
        descriptionLines={[
          "Manage application users. Use filters to control the list.",
          "Columns adapt based on your role."
        ]}
        actions={[
          { icon: <FaPlus />, title: "New User", route: "/users/create" }
        ]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        searchPlaceholder="Search users..."
        entriesValue={entriesPerPage}
        onEntriesChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}
      >
        <div className="col-md-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            options={[
              { label: "All", value: "" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" }
            ]}
          />
        </div>

        <div className="col-md-3">          {/*<div className="small text-muted">Created after</div>*/}

          <FilterDate value={createdAfter} onChange={(v) => { setCreatedAfter(v); setCurrentPage(1); }} />
        </div>
      </FilterSection>

      {loading ? (
        <div>Loading users...</div>
      ) : error ? (
        <div role="alert" style={{ color: 'red' }}>Error: {error}</div>
      ) : users.length === 0 ? (
        <div>No users found.</div>
      ) : (
        <EntityTable
          title="Users"
          columns={columns}
          rows={tableRows}
          emptyMessage={loading ? "Loading..." : (error ? `Error: ${error}` : "No users to display.")}
          linkColumnName="User Fullname"
          rowLink={(_, rowIndex) => {
            const u = paged[rowIndex];
            const id = getField(u, "userId", "UserId", "id", "Id");
            // Row click links to user DETAILS page (not edit)
            return `/users/${id}`;
          }}
        />
      )}

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