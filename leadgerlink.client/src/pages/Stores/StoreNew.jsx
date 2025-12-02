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
  - Add new store form (UI only). Submit handler intentionally left unimplemented.
  - Rows:
    1) Store Name + Operational Status (dropdown)
    2) Email + Phone Number
    3) Store Manager (dropdown) + Opening Date (date)
    4) Working Hours
    5) Location
    6) Actions (Cancel / Save)
*/

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
  const [error, setError] = useState("");

  // load operational statuses and users (managers)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // operational statuses
        try {
          const res = await fetch("/api/operationalstatuses", { credentials: "include" });
          if (res.ok) {
            const json = await res.json();
            if (mounted) {
              const opts = [{ label: "Select status", value: "" }, ...(Array.isArray(json) ? json.map(s => ({ label: s.operationalStatusName ?? s.OperationalStatusName ?? String(s), value: String(s.operationalStatusId ?? s.OperationalStatusId ?? s.id ?? "") })) : [])];
              setStatusOptions(opts);
            }
          }
        } catch (ex) {
          console.error("Failed to load operational statuses", ex);
        }

        // managers: try endpoints that may return all users
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
              // next
            }
          }
          if (mounted) {
            const opts = [{ label: "Select manager", value: "" }, ...(Array.isArray(usersData) ? usersData.map(u => ({ label: (u.fullName ?? (u.userFirstname ? `${u.userFirstname} ${u.userLastname}` : (u.name ?? u.UserName ?? "Unnamed")) ), value: String(u.userId ?? u.UserId ?? u.id ?? "") })) : [])];
            setManagerOptions(opts);
          }
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

  // submit intentionally not implemented
  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: implement save logic when requested
    console.log("Submit not implemented. Form values:", {
      storeName,
      operationalStatusId,
      email,
      phoneNumber,
      managerId,
      openingDate,
      workingHours,
      location
    });
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaStore size={28} />}
        title="Add Store"
        descriptionLines={[
          "Create a new store record. Fill the form and save.",
        ]}
              actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: Store Name + Operational Status */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Store Name" required value={storeName} onChange={setStoreName} placeholder="Store name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField label="Operational Status" value={operationalStatusId} onChange={setOperationalStatusId} options={statusOptions} searchable={false} />
          </div>

          {/* Row 2: Email + Phone Number */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="store@example.com" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} placeholder="+973-3XX-XXXX" />
          </div>

          {/* Row 3: Store Manager + Opening Date */}
          <div className="col-12 col-md-6 text-start">
            <SelectField label="Store Manager" value={managerId} onChange={setManagerId} options={managerOptions} searchable={true} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Opening Date" value={openingDate} onChange={setOpeningDate} />
          </div>

          {/* Row 4: Working Hours */}
          <div className="col-12 text-start">
            <InputField label="Working Hours" value={workingHours} onChange={setWorkingHours} placeholder="e.g. Mon-Fri 09:00 - 18:00" />
          </div>

          {/* Row 5: Location */}
          <div className="col-12 text-start">
            <InputField label="Location" value={location} onChange={setLocation} placeholder="Address or location description" />
          </div>

          {/* Row 6: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/stores")}
              submitLabel="Save Store"
              loading={false}
            />
          </div>

          {/* optional loading / error display */}
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
        </div>
      </FormBody>
    </div>
  );
};

export default StoreNew;