import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaPlus } from "react-icons/fa";

import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";

/*
  UserNew.jsx
  - Add new user form (UI only). Submit is intentionally left unimplemented.
  - Rows:
    1) First Name + Last Name
    2) Email + Phone Number
    3) Organization (dropdown) + Role (dropdown)
    4) Store (dropdown) + Initial Password
    5) Active User (switch)
    6) Actions (Cancel / Save) - Save is a stub
*/

const UserNew = () => {
  const navigate = useNavigate();

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [storeId, setStoreId] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  // lookups / UI state
  const [organizationOptions, setOrganizationOptions] = useState([{ label: "Select organization", value: "" }]);
  const [storeOptions, setStoreOptions] = useState([{ label: "Select store", value: "" }]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState("");

  // static role options (adjust if you have a roles endpoint)
  const ROLE_OPTIONS = [
    { label: "Select role", value: "" },
    { label: "Application Admin", value: "Application Admin" },
    { label: "Organization Admin", value: "Organization Admin" },
    { label: "Organization Accountant", value: "Organization Accountant" },
    { label: "Store Manager", value: "Store Manager" },
    { label: "Store Employee", value: "Store Employee" },
  ];

  // load organizations on mount
  useEffect(() => {
    let mounted = true;
    const loadOrgs = async () => {
      setLoadingOrgs(true);
      setError("");
      try {
        const res = await fetch("/api/organizations", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load organizations");
        const json = await res.json();
        if (!mounted) return;
        const opts = [{ label: "Select organization", value: "" }, ...(Array.isArray(json) ? json.map(o => ({ label: o.orgName ?? o.OrgName ?? o.name ?? `Org ${o.orgId ?? o.id}`, value: String(o.orgId ?? o.OrgId ?? o.id ?? "") })) : [])];
        setOrganizationOptions(opts);
      } catch (ex) {
        console.error("Load organizations failed", ex);
        if (mounted) setError("Failed to load organizations");
      } finally {
        if (mounted) setLoadingOrgs(false);
      }
    };

    loadOrgs();
    return () => { mounted = false; };
  }, []);

  // load stores when organization changes (best-effort)
  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      setLoadingStores(true);
      setStoreOptions([{ label: "Select store", value: "" }]);
      try {
        if (!organizationId) {
          // Optionally fetch all stores when no org selected, but keep simple: empty list
          setStoreOptions([{ label: "Select store", value: "" }]);
          return;
        }

        // API supports: GET /api/stores/by-organization/{organizationId}
        const res = await fetch(`/api/stores/by-organization/${encodeURIComponent(organizationId)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load stores");
        const json = await res.json();
        if (!mounted) return;
        const opts = [{ label: "Select store", value: "" }, ...(Array.isArray(json) ? json.map(s => ({ label: s.storeName ?? s.StoreName ?? s.name ?? `Store ${s.storeId ?? s.id}`, value: String(s.storeId ?? s.StoreId ?? s.id ?? "") })) : [])];
        setStoreOptions(opts);
      } catch (ex) {
        console.error("Load stores failed", ex);
        if (mounted) setError("Failed to load stores");
      } finally {
        if (mounted) setLoadingStores(false);
      }
    };

    loadStores();
    return () => { mounted = false; };
  }, [organizationId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit intentionally not implemented per instructions.
    console.log("Submit not implemented. Form values:", {
      firstName, lastName, email, phone, organizationId, role, storeId, initialPassword, isActive
    });
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaUserPlus size={28} />}
        title="Add User"
        descriptionLines={[
          "Create a new user account. Fill the fields and save.",
        ]}
              actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {/* Row 1: First Name + Last Name */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="First Name" required value={firstName} onChange={setFirstName} placeholder="First name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>

          {/* Row 2: Email + Phone */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" required value={email} onChange={setEmail} placeholder="user@example.com" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+973-3XX-XXXX" />
          </div>

          {/* Row 3: Organization + Role */}
          <div className="col-12 col-md-6 text-start">
            <SelectField label="Organization" value={organizationId} onChange={setOrganizationId} options={organizationOptions} searchable={true} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} searchable={false} />
          </div>

          {/* Row 4: Store + Initial Password */}
          <div className="col-12 col-md-6 text-start">
            <SelectField label="Store" value={storeId} onChange={setStoreId} options={storeOptions} searchable={true} />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Initial Password" type="password" value={initialPassword} onChange={setInitialPassword} placeholder="Temporary password" />
          </div>

          {/* Row 5: Active User */}
          <div className="col-12 col-md-4 text-start d-flex align-items-center">
            <SwitchField label="Active User" checked={isActive} onChange={setIsActive} />
          </div>

          {/* Row 6: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/users")}
              submitLabel="Save User"
              loading={false}
            />
          </div>

          {/* optional error */}
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

export default UserNew;