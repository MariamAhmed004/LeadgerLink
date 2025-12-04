import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaStore, FaPencilAlt } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";

/*
  StoreView
  - Fetches store detail from repository-backed endpoint GET /api/stores/{id}
  - Uses the server's canonical field names (storeId, storeName, location, email, phoneNumber, openingDate, operationalStatusName, workingHours, createdAt, updatedAt, userName)
  - Presents detail + metadata via DetailViewWithMetadata
*/

const StoreView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/stores/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Store not found.");
          const t = await res.text().catch(() => null);
          throw new Error(t || `Failed to load store (${res.status})`);
        }
        const dto = await res.json();
        if (!mounted) return;

        // Map server DTO -> client store shape (keep names consistent)
        const mapped = {
          storeId: dto.storeId,
          storeName: dto.storeName,
          location: dto.location,
          orgId: dto.orgId,
          userId: dto.userId,
          userName: dto.userName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          openingDate: dto.openingDate,
          operationalStatusName: dto.operationalStatusName,
          workingHours: dto.workingHours,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        };

        setStore(mapped);
      } catch (ex) {
        console.error(ex);
        if (mounted) setError(ex?.message || "Failed to load store");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  const headerProps = {
    icon: <FaStore size={28} />,
      title: store ? `Store#${store.storeId} ${store.storeName}` : (loading ? "Loading..." : "Store"),
    descriptionLines: store ? [store.location || ""] : []
  };

  const detail = {
    title: store ? `Store#${store.storeId} ${store.storeName} details` : "Store details",
    rows: [
      { label: "Location", value: store?.location ?? "" },
      { label: "Store Manager", value: store?.userName ?? "-" },
      { label: "Email", value: store?.email ?? "-" },
      { label: "Phone", value: store?.phoneNumber ?? "-" },
      { label: "Opening Date", value: store?.openingDate ? new Date(store.openingDate).toLocaleDateString() : "-" },
      { label: "Operational Status", value: store?.operationalStatusName ?? "-" },
      { label: "Working Hours", value: store?.workingHours ?? "-" },
    ],
  };

  const metadata = {
    title: "About This Store",
    rows: [
      { label: "Created At", value: store?.createdAt ? new Date(store.createdAt).toLocaleString() : "-" },
      { label: "Updated At", value: store?.updatedAt ? new Date(store.updatedAt).toLocaleString() : "-" },
    ],
  };

  const actions = headerProps.actions;

  if (loading) {
    return <div className="container py-5">Loading store...</div>;
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Error: {error}</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  return (
    <DetailViewWithMetadata
      headerProps={headerProps}
      detail={detail}
      metadata={metadata}
      actions={actions}
    />
  );
};

export default StoreView;