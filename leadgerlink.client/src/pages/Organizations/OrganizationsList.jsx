import React, { useEffect, useState } from "react";
import { FaPlus, FaExternalLinkAlt, FaEnvelope } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BiSolidBuildings } from "react-icons/bi";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  OrganizationsList.jsx
  - Cleaned: use canonical DTO field names returned by the API.
  - Assumes server returns OrganizationListDto JSON as camelCase:
    { orgId, orgName, email, phone, industryTypeName, createdAt, storesCount, usersCount, websiteUrl, isActive }
*/

const OrganizationsList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // success alert state
  const [successMsg, setSuccessMsg] = useState("");

  // show success message if navigated from create or edit page
  useEffect(() => {
    const state = location?.state ?? {};
    if (state.created || state.updated) {
      const name = state.createdName ?? state.updatedName ?? "Organization";
      const msg = state.created ? `"${name}" added successfully.` : `"${name}" updated successfully.`;
      setSuccessMsg(msg);
      // clear history state so refresh/navigation doesn't show the alert again
      navigate(location.pathname, { replace: true, state: {} });
      // auto-dismiss after 5s
      const t = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [location, navigate]);

  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [organizations, setOrganizations] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([{ label: "All", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const orgRes = await fetch("/api/organizations", { credentials: "include" });
        if (!orgRes.ok) {
          const txt = await orgRes.text();
          throw new Error(txt || "Failed to load organizations");
        }
        const orgData = await orgRes.json();
        if (!mounted) return;
        const orgs = Array.isArray(orgData) ? orgData : (orgData.items || []);
        setOrganizations(orgs);

        // Fetch industry types (use industryTypeName as the option value to match organization DTO)
        try {
          const itRes = await fetch("/api/organizations/industrytypes", { credentials: "include" });
          if (itRes.ok) {
            const itData = await itRes.json();
            if (!mounted) return;
            const opts = [
              { label: "All", value: "" },
              ...(Array.isArray(itData)
                ? itData.map(it => ({
                    label: it.industryTypeName,
                    value: it.industryTypeName
                  }))
                : [])
            ];
            setIndustryOptions(opts);
          } else {
            // fallback: derive from returned orgs using canonical field
            if (mounted) setIndustryOptions(buildIndustryOptionsFromOrgs(orgs));
          }
        } catch {
          if (mounted) setIndustryOptions(buildIndustryOptionsFromOrgs(orgs));
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load organizations");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const buildIndustryOptionsFromOrgs = (orgs) => {
    const set = new Set();
    (orgs || []).forEach(o => {
      const name = o.industryTypeName ?? null;
      if (name) set.add(name);
    });
    return [{ label: "All", value: "" }, ...Array.from(set).map(n => ({ label: n, value: n }))];
  };

  // client-side filtering using canonical fields (no multiple-name checks)
  const filtered = organizations.filter((o) => {
    if (statusFilter === "active" && o.isActive !== true) return false;
    if (statusFilter === "inactive" && o.isActive === true) return false;

    if (industryFilter) {
      if ((o.industryTypeName ?? "") !== industryFilter) return false;
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const s = searchTerm.trim().toLowerCase();
      const name = (o.orgName ?? "").toLowerCase();
      const email = (o.email ?? "").toLowerCase();
      const industry = (o.industryTypeName ?? "").toLowerCase();
      return name.includes(s) || email.includes(s) || industry.includes(s);
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  const tableRows = paged.map((o) => {
    const name = o.orgName ?? "—";
    const industry = o.industryTypeName ?? "-";
    const email = o.email ?? "";
    const website = o.websiteUrl ?? "";

    const statusCell = o.isActive === true
      ? <span className="badge bg-success">Active</span>
      : <span className="badge bg-secondary">Inactive</span>;

    const emailCell = email
      ? (<a href={`mailto:${email}`} className="text-decoration-none"><FaEnvelope className="me-1" />{email}</a>)
      : (<span className="text-muted">—</span>);

    const websiteCell = website
      ? (() => {
          const href = String(website).startsWith("http") ? website : `https://${website}`;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" title="Open website">
              <FaExternalLinkAlt />
            </a>
          );
        })()
      : <span className="text-muted">—</span>;

    return [
      statusCell,
      name,
      industry,
      emailCell,
      websiteCell
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
              icon={<BiSolidBuildings size={55} />}
        title="Organizations"
        descriptionLines={[
          "Following organization are contracted with LedgerLink:",
          "Click on the organization name to view its details"
        ]}
        actions={[ { icon: <FaPlus />, title: "New Organization", route: "/organizations/new" } ]}
      />

      {/* success alert */}
      {successMsg && (
        <div className="row">
          <div className="col-12">
            <div className="alert alert-success">{successMsg}</div>
          </div>
        </div>
      )}

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        searchPlaceholder="Search organizations..."
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

        <div className="col-md-4">
          <FilterSelect
            label="Industry Type"
            value={industryFilter}
            onChange={(v) => { setIndustryFilter(v); setCurrentPage(1); }}
            options={industryOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Organizations"
        columns={["Status", "Organization Name", "Industry Type", "Email", "Website"]}
        rows={tableRows}
        emptyMessage={loading ? "Loading..." : (error ? `Error: ${error}` : "No organizations to display.")}
        linkColumnName="Organization Name"
        rowLink={(_, rowIndex) => {
          const o = paged[rowIndex];
          const id = o.orgId;
          return `/organizations/${id}`;
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
};

export default OrganizationsList;