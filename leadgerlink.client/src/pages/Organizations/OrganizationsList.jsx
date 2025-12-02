import React, { useEffect, useState } from "react";
import { FaPlus, FaExternalLinkAlt, FaEnvelope } from "react-icons/fa";
import { Link } from "react-router-dom";

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

/*
  OrganizationsList.jsx
  - Lists organizations with search, pagination and filters (status + industry type).
  - Uses client-side filtering/paging (fetches organizations + optional industry types).
  - Integrates existing listing components (PageHeader, FilterSection, FilterSelect, EntityTable, PaginationSection).
*/

const OrganizationsList = () => {
  // filters / search
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // data
  const [organizations, setOrganizations] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([{ label: "All", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load organizations + industry types
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // fetch organizations
        const orgRes = await fetch("/api/organizations", { credentials: "include" });
        if (!orgRes.ok) {
          const txt = await orgRes.text();
          throw new Error(txt || "Failed to load organizations");
        }
        const orgData = await orgRes.json();

        if (!mounted) return;

        // normalize array
        const orgs = Array.isArray(orgData) ? orgData : (orgData.items || []);
        setOrganizations(orgs);

        // try to fetch industry types endpoint (fallback to deriving from orgs when unavailable)
        try {
          const itRes = await fetch("/api/industrytypes", { credentials: "include" });
          if (itRes.ok) {
            const itData = await itRes.json();
            if (mounted) {
              const opts = [{ label: "All", value: "" }, ...(Array.isArray(itData) ? itData.map(it => ({ label: it.industryTypeName ?? it.IndustryTypeName ?? it.industry_type_name ?? it.name ?? String(it), value: String(it.industryTypeId ?? it.IndustryTypeId ?? it.industry_type_id ?? it.id ?? "" ) })) : [])];
              setIndustryOptions(opts);
            }
          } else {
            // fallback below
            if (mounted) {
              const fromOrgs = buildIndustryOptionsFromOrgs(orgs);
              setIndustryOptions(fromOrgs);
            }
          }
        } catch {
          if (mounted) {
            const fromOrgs = buildIndustryOptionsFromOrgs(orgs);
            setIndustryOptions(fromOrgs);
          }
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

  // helper: build industry options derived from organizations
  const buildIndustryOptionsFromOrgs = (orgs) => {
    const map = new Map();
    (orgs || []).forEach(o => {
      const id = String(o.industryType?.industryTypeId ?? o.IndustryType?.IndustryTypeId ?? o.industryTypeId ?? o.IndustryTypeId ?? o.industry_type_id ?? "");
      const name = o.industryType?.industryTypeName ?? o.IndustryType?.IndustryTypeName ?? o.industryTypeName ?? o.IndustryTypeName ?? o.industry_type_name ?? o.industryType ?? "";
      if (id || name) {
        const key = id || name;
        if (!map.has(key)) map.set(key, { label: name || key, value: key });
      }
    });
    return [{ label: "All", value: "" }, ...Array.from(map.values())];
  };

  // client-side filtering
  const filtered = organizations.filter((o) => {
    // status filter
    if (statusFilter === "active" && !(o.isActive === true || o.IsActive === true)) return false;
    if (statusFilter === "inactive" && (o.isActive === true || o.IsActive === true)) return false;

    // industry filter (compare ids or names)
    if (industryFilter) {
      const orgIndustryId = String(o.industryType?.industryTypeId ?? o.IndustryType?.IndustryTypeId ?? o.industryTypeId ?? o.IndustryTypeId ?? o.industry_type_id ?? "");
      const orgIndustryName = String(o.industryType?.industryTypeName ?? o.IndustryType?.IndustryTypeName ?? o.industryTypeName ?? o.IndustryTypeName ?? o.industry_type_name ?? "");
      if (industryFilter !== orgIndustryId && industryFilter !== orgIndustryName) return false;
    }

    // search (name, email, industry name)
    if (searchTerm && String(searchTerm).trim() !== "") {
      const s = String(searchTerm).trim().toLowerCase();
      const name = String(o.orgName ?? o.OrgName ?? o.org_name ?? o.OrgName ?? o.name ?? o.Name ?? "").toLowerCase();
      const email = String(o.email ?? o.Email ?? "").toLowerCase();
      const industryName = String(o.industryType?.industryTypeName ?? o.IndustryType?.IndustryTypeName ?? o.industryTypeName ?? o.industry_type_name ?? "").toLowerCase();
      return name.includes(s) || email.includes(s) || industryName.includes(s);
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const page = Math.max(1, currentPage);
  const paged = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // map rows for EntityTable
  const tableRows = paged.map((o) => {
    const id = o.orgId ?? o.OrgId ?? o.org_id ?? o.id ?? o.Id;
    const name = o.orgName ?? o.OrgName ?? o.org_name ?? o.name ?? o.Name ?? "—";
    const industry = o.industryType?.industryTypeName ?? o.IndustryType?.IndustryTypeName ?? o.industryTypeName ?? o.industry_type_name ?? "-";
    const email = o.email ?? o.Email ?? "";
    const website = o.websiteUrl ?? o.WebsiteUrl ?? o.website_url ?? "";

    const statusCell = (o.isActive === true || o.IsActive === true)
      ? <span className="badge bg-success">Active</span>
      : <span className="badge bg-secondary">Inactive</span>;

    const emailCell = email
      ? (<a href={`mailto:${email}`} className="text-decoration-none"><FaEnvelope className="me-1" />{email}</a>)
      : (<span className="text-muted">—</span>);

    const websiteCell = website
      ? (() => {
          // ensure scheme exists
          const href = String(website).startsWith("http") ? website : `https://${website}`;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" title="Open website">
              <FaExternalLinkAlt />
            </a>
          );
        })()
        : <FaPlus title="No website" className="text-muted" />;

    return [
      statusCell,
      name, // EntityTable will wrap this cell with a Link because we will set linkColumnName
      industry,
      emailCell,
      websiteCell
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaPlus size={28} />}
        title="Organizations"
        descriptionLines={[
          "Overview of organizations. Use filters to narrow results.",
          "Click an organization to view details."
        ]}
        actions={[
          { icon: <FaPlus />, title: "New Organization", route: "/organizations/new" }
        ]}
      />

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
        // rowLink builds URL using the original paged array (paged index correlates to tableRows index)
        rowLink={(_, rowIndex) => {
          const o = paged[rowIndex];
          const id = o?.orgId ?? o?.OrgId ?? o?.org_id ?? o?.id ?? o?.Id;
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