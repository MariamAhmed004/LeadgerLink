import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";
import { BiSolidBuildings } from "react-icons/bi";

/*
  OrganizationView.jsx
  - Cleaned to use canonical DTO field names returned by the API (camelCase).
  - Expected shape:
    {
      orgId,
      orgName,
      email,
      phone,
      industryTypeName,
      regestirationNumber,
      establishmentDate,
      websiteUrl,
      createdAt,
      organizationAdminName,
      storesCount,
      usersCount
    }
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

export default function OrganizationView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/organizations/${id}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Organization not found");
          }
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load organization (status ${res.status})`);
        }
        const json = await res.json();
        if (!mounted) return;
        setOrg(json);
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError(err?.message || "Failed to load organization");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  const idVal = org ? (org.orgId ?? id) : id;
  const nameVal = org ? (org.orgName ?? "") : "";

  const headerProps = {
      icon: <BiSolidBuildings size={55} />,
    title: org ? `Organization#${idVal} ${nameVal}` : "Organization",
      descriptionLines: org ? [org.organizationAdminName ?? "Organization details"] : ["Organization details"],
    actions: []
  };

  const actions = [
    { icon: <FaArrowLeft />, title: "Back to Organizations", onClick: () => navigate("/organizations") },
    { icon: <FaEdit />, title: "Edit Organization", route: `/organizations/edit/${idVal}` }
  ];

  const detailRows = org ? [
    { label: "Email", value: org.email ?? "" },
    { label: "Phone Number", value: org.phone ?? "" },
    { label: "Industry Type", value: org.industryTypeName ?? "" },
    { label: "Registration Number", value: org.regestirationNumber ?? "" },
    { label: "Establishment Date", value: fmtDate(org.establishmentDate) },
    { label: "Website", value: org.websiteUrl ?? "" },
    { label: "Created At", value: fmtDate(org.createdAt) },
    { label: "Organization Admin", value: org.organizationAdminName ?? "" },
    { label: "Number of Stores", value: String(org.storesCount ?? 0) },
    { label: "Number of Users", value: String(org.usersCount ?? 0) }
  ] : [];

  return (
    <div className="container py-5">
      <PageHeader {...headerProps} actions={[]} />

      <div className="row gx-4 gy-4">
        <div className="col-12">
          {loading ? (
            <div>Loading organization...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <DetailTable title={`organization#${idVal} ${nameVal}`} rows={detailRows} />
          )}
        </div>

        <div className="col-12 d-flex justify-content-center">
          <DetailPageAction actions={actions} orientation="horizontal" align="end" />
        </div>
      </div>
    </div>
  );
}