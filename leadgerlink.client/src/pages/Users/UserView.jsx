import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaArrowLeft, FaEdit } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";

/*
  UserView.jsx
  - Detail page for a single user.
  - Uses PageHeader, DetailTable and DetailPageAction components (no metadata table).
  - Fetches user by id: GET /api/users/{id}
  - Expected server response (canonical fields):
    { userId, fullName, email, phone, role, organizationName, isActive, createdAt }
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

export default function UserView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("User not found");
          }
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load user (status ${res.status})`);
        }
        const json = await res.json();
        if (!mounted) return;
        setUser(json);
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError(err?.message || "Failed to load user");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  const idVal = user ? (user.userId ?? id) : id;
  const nameVal = user ? (user.fullName ?? "") : "";

  const headerProps = {
    icon: <FaUser size={28} />,
    title: user ? `User#${idVal} ${nameVal}` : "User",
    descriptionLines: user ? [user.fullName ?? "User details"] : ["User details"],
    actions: []
  };

  const actions = [
    { icon: <FaArrowLeft />, title: "Back to Users", onClick: () => navigate("/users") },
    { icon: <FaEdit />, title: "Edit User", route: `/users/edit/${idVal}` }
  ];

  const statusElement = (user && user.isActive === true)
    ? <span className="badge bg-success px-3 py-2">Active</span>
    : <span className="badge bg-secondary px-3 py-2">Inactive</span>;

  const detailRows = user ? [
    { label: "Email", value: user.email ?? "" },
    { label: "Phone Number", value: user.phone ?? "" },
    { label: "Role", value: user.role ?? "" },
    { label: "Organization", value: user.organizationName ?? "" },
    { label: "Status", value: statusElement },
    { label: "Account Created On", value: fmtDate(user.createdAt) }
  ] : [];

  return (
    <div className="container py-5">
      <PageHeader {...headerProps} actions={[]} />

      <div className="row gx-4 gy-4">
        <div className="col-12">
          {loading ? (
            <div>Loading user...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <DetailTable title={`User#${idVal} ${nameVal}`} rows={detailRows} />
          )}
        </div>

        <div className="col-12 d-flex justify-content-center">
          <DetailPageAction actions={actions} orientation="horizontal" align="end" />
        </div>
      </div>
    </div>
  );
}