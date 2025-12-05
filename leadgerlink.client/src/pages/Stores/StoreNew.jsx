import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStore, FaPlus } from "react-icons/fa";

import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import TimestampField from "../../components/Form/TimestampField";
import FormActions from "../../components/Form/FormActions";

/*
  StoreNew.jsx
  - Client-only validation (prevents server-side validation errors)
  - Submit uses canonical field names only:
      storeName, operationalStatusId, email, phoneNumber, userId, openingDate, workingHours, location
  - Does not send createdAt/updatedAt in payload
*/

const emailIsValid = (e) => /^\S+@\S+\.\S+$/.test(String(e || "").trim());

const StoreNew = () => {
  const navigate = useNavigate();

  // form fields
  const [storeName, setStoreName] = useState("");
  const [operationalStatusId, setOperationalStatusId] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerId, setManagerId] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [location, setLocation] = useState("");

  // lookups / ui
  const [statusOptions, setStatusOptions] = useState([{ label: "Select status", value: "" }]);
  const [managerOptions, setManagerOptions] = useState([{ label: "Select manager", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // helper: fetch operational statuses
  const fetchOperationalStatuses = async () => {
    try {
      const res = await fetch("/api/stores/operationalstatuses", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      const opts = [
        { label: "Select status", value: "" },
        ...(Array.isArray(json)
          ? json.map((s) => ({
              label: s.operationalStatusName ?? s.operationalStatusname ?? String(s),
              value: String(s.operationalStatusId ?? s.operationalStatusid ?? "")
            }))
          : [])
      ];
      setStatusOptions(opts);
    } catch (ex) {
      console.error("Failed to load operational statuses", ex);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await fetchOperationalStatuses();

        // managers: attempt endpoints that may expose users
        try {
          const endpoints = ["/api/users/all", "/api/users"];
          let usersData = [];
          for (const ep of endpoints) {
            try {
              const r = await fetch(ep, { credentials: "include" });
              if (!r.ok) continue;
              const j = await r.json();
              usersData = Array.isArray(j) ? j : (Array.isArray(j.items) ? j.items : []);
              break;
            } catch {
              // try next
            }
          }
          if (!mounted) return;
          const opts = [
            { label: "Select manager", value: "" },
            ...(Array.isArray(usersData)
              ? usersData.map((u) => ({
                  label:
                    u.fullName ??
                    (u.userFirstname ? `${u.userFirstname} ${u.userLastname}` : (u.name ?? u.userName ?? "Unnamed")),
                  value: String(u.userId ?? u.UserId ?? u.id ?? "")
                }))
              : [])
          ];
          setManagerOptions(opts);
        } catch (ex) {
          console.error("Failed to load manager list", ex);
        }
      } catch (ex) {
        console.error(ex);
        if (mounted) setError("Failed to load lookups");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // client-only validation and canonical payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation only
    if (!storeName.trim()) return setError("Store name is required.");
    const opIdNum = Number(operationalStatusId);
    if (!operationalStatusId || !Number.isFinite(opIdNum) || opIdNum <= 0)
      return setError("Please select a valid operational status.");
    if (email && !emailIsValid(email)) return setError("Provide a valid email address.");
    // optional: ensure manager id is numeric if provided
    if (managerId && !Number.isFinite(Number(managerId))) return setError("Invalid manager selection.");

    setSaving(true);

    try {
      // canonical payload (no createdAt/updatedAt)
      const payload = {
        storeName: storeName.trim(),
        operationalStatusId: opIdNum,
        email: email ? email.trim() : null,
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        userId: managerId ? Number(managerId) : null,
        openingDate: openingDate ? new Date(openingDate).toISOString() : null,
        workingHours: workingHours || null,
        location: location || null
      };

      const res = await fetch("/api/stores", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      const created = await res.json().catch(() => null);
      const createdName = created?.storeName ?? payload.storeName;

      setSuccess(`Store "${createdName}" created.`);
      setTimeout(() => {
        navigate("/stores", { state: { created: true, createdName } });
      }, 700);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaStore size={55} />}
        title="Add Store"
              descriptionLines={["Fill in the form to create a store under your organization", "You can create users for the created store later, and select a store manager from previously added user or create an account after you create the store. "]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6 text-start">
            <InputField label="Store Name" required value={storeName} onChange={setStoreName} placeholder="Store name" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Operational Status"
              value={operationalStatusId}
              onChange={setOperationalStatusId}
              options={statusOptions}
              searchable={false}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="store@example.com" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} placeholder="+973-3XX-XXXX" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Store Manager" value={managerId} onChange={setManagerId} options={managerOptions} searchable={true} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Opening Date" value={openingDate} onChange={setOpeningDate} />
          </div>

          <div className="col-12 text-start">
            <InputField label="Working Hours" value={workingHours} onChange={setWorkingHours} placeholder="e.g. Mon-Fri 09:00 - 18:00" />
          </div>

          <div className="col-12 text-start">
            <InputField label="Location" value={location} onChange={setLocation} placeholder="Address or location description" />
          </div>

          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate("/stores")} submitLabel="Save Store" loading={saving} />
          </div>

          {loading && (
            <div className="col-12">
              <div className="text-muted">Loading lookups…</div>
            </div>
          )}
          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}
          {success && (
            <div className="col-12">
              <div className="alert alert-success mb-0">{success}</div>
            </div>
          )}
        </div>
      </FormBody>
    </div>
  );
};

export default StoreNew;