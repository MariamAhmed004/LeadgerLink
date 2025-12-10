import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useAuth } from "../../Context/AuthContext";
import { HiUsers } from "react-icons/hi";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  UsersList.jsx (clean)
  - Uses canonical API field names only (server should return these):
    { userId, userFirstname, userLastname, email, phone, role, organizationName, isActive, createdAt }
  - Concatenate first + last name for display.
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
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        const isAppAdmin = loggedInUser?.roles?.includes("Application Admin");
        const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
        const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
        const isStoreManager = loggedInUser?.roles?.includes("Store Manager");

        if (!isAppAdmin) {
          if (isOrgAdmin || isOrgAccountant) {
            const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId;
            if (orgId) qs.append("orgId", String(orgId));
          } else if (isStoreManager) {
            const storeId = loggedInUser?.storeId ?? loggedInUser?.StoreId;
            if (storeId) qs.append("storeId", String(storeId));
          }
        }

        const [usersRes, orgsRes] = await Promise.all([
          fetch(`/api/users?${qs.toString()}`, { credentials: "include" }),
          fetch("/api/organizations", { credentials: "include" })
        ]);

        if (!mounted) return;

        if (!usersRes.ok) throw new Error("Failed to load users");
        const usersJson = await usersRes.json();
        const usersArr = Array.isArray(usersJson) ? usersJson : (usersJson.items || []);
        setUsers(usersArr);

        if (orgsRes.ok) {
          const orgsJson = await orgsRes.json();
          const orgsArr = Array.isArray(orgsJson) ? orgsJson : (orgsJson.items || []);
          setOrganizations(orgsArr);
        }
      } catch (ex) {
        console.error(ex);
        if (mounted) setError(ex.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [loggedInUser]);

  // lookup helpers using canonical names
  const findOrgName = (orgId) => {
    const o = organizations.find((x) => x.orgId === orgId || x.OrgId === orgId);
    return o ? (o.orgName ?? o.OrgName ?? "") : "";
  };

  // client-side filtering using canonical fields + role-based scope
  const filtered = users.filter((u) => {
    const isAppAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
    const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
    const isStoreManager = loggedInUser?.roles?.includes("Store Manager");

    if (!isAppAdmin) {
      if (isOrgAdmin || isOrgAccountant) {
        const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId;
        if (orgId && String(u.orgId ?? u.OrgId ?? "") !== String(orgId)) return false;
      } else if (isStoreManager) {
        const storeId = loggedInUser?.storeId ?? loggedInUser?.StoreId;
        if (storeId && String(u.storeId ?? u.StoreId ?? "") !== String(storeId)) return false;
      }
    }

    if (statusFilter === "active" && u.isActive !== true) return false;
    if (statusFilter === "inactive" && u.isActive === true) return false;

    if (createdAfter) {
      const created = u.createdAt ? new Date(u.createdAt) : null;
      if (!created) return false;
      if (!(created >= new Date(createdAfter))) return false;
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const s = searchTerm.trim().toLowerCase();
      const name = (((u.userFirstname ?? "") + " " + (u.userLastname ?? "")).trim()).toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const phone = String(u.phone ?? "").toLowerCase();
      const role = (u.role ?? "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s) || role.includes(s);
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalEntries / entriesPerPage)), [totalEntries, entriesPerPage]);
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // build rows (canonical fields) - full name concatenated from first + last
  const tableRows = paged.map((u) => {
      const id = u.userId;
      const fullName = u.fullName ?? "-";
    const email = u.email ?? "";
    const phone = u.phone ?? "";
    const role = u.role ?? "";
    const orgName = u.organizationName ?? findOrgName(u.orgId) ?? "-";
    const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleString() : "-";

    const statusCell = u.isActive === true
      ? <span className="badge bg-success">Active</span>
      : <span className="badge bg-secondary">Inactive</span>;

    // Columns vary by role like before, but use canonical fields only
    const isAppAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
    const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
    const isStoreManager = loggedInUser?.roles?.includes("Store Manager");

    if (isAppAdmin) {
      return [
        statusCell,
        fullName,
        orgName,
        role || "-",
        email || "-"
      ];
    }

    if (isOrgAdmin || isOrgAccountant) {
      return [
        statusCell,
        fullName,
        u.storeName ?? "-", // optional: server may include storeName; otherwise store id not shown
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
        createdAt
      ];
    }

    return [
      statusCell,
      fullName,
      role || "-",
      email || "-"
    ];
  });

  const columns = (() => {
    const isAppAdmin = loggedInUser?.roles?.includes("Application Admin");
    const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
    const isOrgAccountant = loggedInUser?.roles?.includes("Organization Accountant");
    const isStoreManager = loggedInUser?.roles?.includes("Store Manager");

    if (isAppAdmin) return ["Status", "User Fullname", "Organization", "Role", "Email"];
    if (isOrgAdmin || isOrgAccountant) return ["Status", "User Fullname", "Store", "Role", "Email"];
    if (isStoreManager) return ["Status", "User Fullname", "Email", "Phone", "Created At"];
    return ["Status", "User Fullname", "Role", "Email"];
  })();

  return (
    <div className="container py-5">
      <PageHeader
              icon={<HiUsers size={55} />}
        title="Users"
        descriptionLines={[
          "Following are all users registered in LedgerLink:",
          "Click on the user name to view its details"
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

        <div className="col-md-3">
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
            const id = u.userId;
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