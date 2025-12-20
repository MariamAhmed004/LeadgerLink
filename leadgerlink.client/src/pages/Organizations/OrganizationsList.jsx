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
  SUMMARY:
  - Renders the Organizations listing with filters, paging and basic actions.
  - Loads organizations + industry types, applies client-side filters and paging,
    and displays rows in an EntityTable. Shows a success alert when navigated
    from create/edit with state.
*/

// --------------------------------------------------
// STATE DECLARATIONS
// --------------------------------------------------

// location + navigation helpers (used for showing success alert and navigation)
const OrganizationsList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // success alert state (shown when navigated back from create/edit)
  const [successMsg, setSuccessMsg] = useState("");

  // filters: status, industry and free text search
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // paging state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // data + lookups + UI flags
  const [organizations, setOrganizations] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([{ label: "All", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // EFFECT: Show success alert when navigated with state
  // --------------------------------------------------
  useEffect(() => {
    const state = location?.state ?? {};
    // If navigation included created/updated flags, show the success message
    if (state.created || state.updated) {
      const name = state.createdName ?? state.updatedName ?? "Organization";
      const msg = state.created ? `"${name}" added successfully.` : `"${name}" updated successfully.`;
      setSuccessMsg(msg);

      // Clear navigation state so refresh doesn't re-show the alert
      navigate(location.pathname, { replace: true, state: {} });

      // Auto-dismiss after 5s
      const t = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [location, navigate]);

  // --------------------------------------------------
  // EFFECT: Load organizations + industry types on mount
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch all organizations
        const orgRes = await fetch("/api/organizations", { credentials: "include" });
        if (!orgRes.ok) {
          const txt = await orgRes.text();
          throw new Error(txt || "Failed to load organizations");
        }
        const orgData = await orgRes.json();
        if (!mounted) return;
        const orgs = Array.isArray(orgData) ? orgData : (orgData.items || []);
        setOrganizations(orgs);

        // Fetch industry types for filter options (prefer organizations controller endpoint)
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
            // fallback: build options from returned organizations if endpoint not available
            if (mounted) setIndustryOptions(buildIndustryOptionsFromOrgs(orgs));
          }
        } catch {
          // fallback on network error as well
          if (mounted) setIndustryOptions(buildIndustryOptionsFromOrgs(orgs));
        }
      } catch (err) {
        // Capture and show any loading errors
        console.error(err);
        if (mounted) setError(err.message || "Failed to load organizations");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // HELPERS: build industry options when endpoint not available
  // --------------------------------------------------
  const buildIndustryOptionsFromOrgs = (orgs) => {
    // derive distinct industry names from the organizations list
    const set = new Set();
    (orgs || []).forEach(o => {
      const name = o.industryTypeName ?? null;
      if (name) set.add(name);
    });
    return [{ label: "All", value: "" }, ...Array.from(set).map(n => ({ label: n, value: n }))];
  };

  // --------------------------------------------------
  // DATA PROCESSING: client-side filtering and paging
  // --------------------------------------------------
  // Filter organizations using selected filters and search term
  const filtered = organizations.filter((o) => {
    // status filtering
    if (statusFilter === "active" && o.isActive !== true) return false;
    if (statusFilter === "inactive" && o.isActive === true) return false;

    // industry filtering (exact match on industryTypeName)
    if (industryFilter) {
      if ((o.industryTypeName ?? "") !== industryFilter) return false;
    }

    // text search across name, email and industry
    if (searchTerm && searchTerm.trim() !== "") {
      const s = searchTerm.trim().toLowerCase();
      const name = (o.orgName ?? "").toLowerCase();
      const email = (o.email ?? "").toLowerCase();
      const industry = (o.industryTypeName ?? "").toLowerCase();
      return name.includes(s) || email.includes(s) || industry.includes(s);
    }

    return true;
  });

  // Compute paging values and the current page slice
  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // --------------------------------------------------
  // ROW BUILDING: prepare table row data for EntityTable
  // --------------------------------------------------
  const tableRows = paged.map((o) => {
    const name = o.orgName ?? "—";
    const industry = o.industryTypeName ?? "-";
    const email = o.email ?? "";
    const website = o.websiteUrl ?? "";

    // Status badge component
    const statusCell = o.isActive === true
      ? <span className="badge bg-success">Active</span>
      : <span className="badge bg-secondary">Inactive</span>;

    // Email cell: mailto link when email exists
    const emailCell = email
      ? (<a href={`mailto:${email}`} className="text-decoration-none"><FaEnvelope className="me-1" />{email}</a>)
      : (<span className="text-muted">—</span>);

    // Website cell: external link icon when website exists
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

  // --------------------------------------------------
  // RENDERING
  // --------------------------------------------------
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

      {/* success alert shown when navigated with created/updated state */}
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