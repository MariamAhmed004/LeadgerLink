import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";
import { HiUsers } from "react-icons/hi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";

/*
  UserNew.jsx (clean)
  - Uses canonical API field names only:
    Organizations: { orgId, orgName }
    Stores: { storeId, storeName }
  - Simple client validation (email, password complexity, role/store rules).
  - Application Admin removed from role list.
*/

const emailIsValid = (e) => /^\S+@\S+\.\S+$/.test(String(e || "").trim());
const passwordIsValid = (p) => {
  if (!p) return false;
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
};

const ROLE_OPTIONS = [
  { label: "Select role", value: "" },
  { label: "Organization Admin", value: "Organization Admin" },
  { label: "Organization Accountant", value: "Organization Accountant" },
  { label: "Store Manager", value: "Store Manager" },
  { label: "Store Employee", value: "Store Employee" }
];

export default function UserNew() {
  const navigate = useNavigate();

  // form fields (canonical names)
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load organizations (expects { orgId, orgName } items)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingOrgs(true);
      try {
        const res = await fetch("/api/organizations", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load organizations");
        const json = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(json) ? json : (json.items || []);
        const opts = [{ label: "Select organization", value: "" }, ...arr.map(o => ({ label: o.orgName, value: String(o.orgId) }))];
        setOrganizationOptions(opts);
      } catch (ex) {
        console.error("Load organizations failed", ex);
        if (mounted) setError("Failed to load organizations");
      } finally {
        if (mounted) setLoadingOrgs(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // load stores for selected organization (expects { storeId, storeName } items)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingStores(true);
      setStoreOptions([{ label: "Select store", value: "" }]);
      try {
        if (!organizationId) return;
        const res = await fetch(`/api/stores/by-organization/${encodeURIComponent(organizationId)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load stores");
        const json = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(json) ? json : (json.items || []);
        const opts = [{ label: "Select store", value: "" }, ...arr.map(s => ({ label: s.storeName, value: String(s.storeId) }))];
        setStoreOptions(opts);
      } catch (ex) {
        console.error("Load stores failed", ex);
        if (mounted) setError("Failed to load stores");
      } finally {
        if (mounted) setLoadingStores(false);
      }
    };

    // only fetch stores when an organization is selected and role requires a store
    const roleRequiresStore = role === "Store Manager" || role === "Store Employee";
    if (organizationId && roleRequiresStore) load();

    return () => { mounted = false; };
  }, [organizationId, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // basic validation (canonical fields)
    if (!email.trim()) return setError("Email is required.");
    if (!emailIsValid(email)) return setError("Provide a valid email address.");
    if (!initialPassword) return setError("Initial password is required.");
    if (!passwordIsValid(initialPassword)) return setError("Password must be at least 8 chars and include upper, lower and a digit.");
    if (role === "Application Admin") return setError("Cannot create Application Admin here.");

    const roleRequiresStore = role === "Store Manager" || role === "Store Employee";
    if (roleRequiresStore && !storeId) return setError("Store selection is required for the selected role.");

    // additional validation
    if (!organizationId) {
      setSaving(false);
      return setError("Organization selection is required.");
    }

    setSaving(true);

    try {
      const payload = {
        username: email.trim(),
        email: email.trim(),
        password: initialPassword,
        role: role || null,
        firstName: firstName || null,
        lastName: lastName || null,
        orgId: organizationId ? Number(organizationId) : null,
        storeId: storeId ? Number(storeId) : null,
        phone: phone || null,
        isActive: Boolean(isActive)
      };

      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      // navigate back with success state
      navigate("/users", { state: { created: true, createdName: `${firstName} ${lastName}`.trim() || email } });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const storeDisabled = !(role === "Store Manager" || role === "Store Employee");

  return (
    <div className="container py-5">
      <PageHeader
              icon={<HiUsers size={55} />}
        title="Add User"
              descriptionLines={["Following details are needed to create a new user:", "You can create a user for created organization."]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6 text-start">
            <InputField label="First Name" required value={firstName} onChange={setFirstName} placeholder="First name" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Last Name" required value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" required value={email} onChange={setEmail} placeholder="user@example.com" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+973-3XX-XXXX" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Organization" value={organizationId} onChange={setOrganizationId} options={organizationOptions} searchable={true} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} searchable={false} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Store" value={storeId} onChange={setStoreId} options={storeOptions} searchable={true} disabled={storeDisabled} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Initial Password" type="password" required value={initialPassword} onChange={setInitialPassword} placeholder="Temporary password" />
          </div>

          <div className="col-12 col-md-4 text-start d-flex align-items-center">
            <SwitchField label="Active User" checked={isActive} onChange={setIsActive} />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/users")}
              submitLabel="Save User"
              loading={saving}
            />
          </div>
        </div>
      </FormBody>
    </div>
  );
}