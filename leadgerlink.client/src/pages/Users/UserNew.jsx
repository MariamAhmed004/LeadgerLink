import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiUsers } from "react-icons/hi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";
import { useAuth } from "../../Context/AuthContext";
import InputWithButton from "../../components/Form/InputWithButton";

/*
  UserNew.jsx (clean)
  - Uses canonical API field names only:
    Organizations: { orgId, orgName }
    Stores: { storeId, storeName }
  - Simple client validation (email, password complexity, role/store rules).
  - Application Admin removed from role list.
  - Added: show/hide password icon and make Organization + Role required.
*/

/*
  SUMMARY:
  - Page for creating a new user. Loads organizations/stores as lookups,
    applies role-based UI rules, validates input, and posts to /api/users.
*/

// --------------------------------------------------
// VALIDATORS
// --------------------------------------------------
const emailIsValid = (e) => /^\S+@\S+\.\S+$/.test(String(e || "").trim());
const passwordIsValid = (p) => {
  if (!p) return false;
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
};

// Role options used when caller is application admin
const ROLE_OPTIONS = [
  { label: "Select role", value: "" },
  { label: "Organization Admin", value: "Organization Admin" },
  { label: "Organization Accountant", value: "Organization Accountant" },
  { label: "Store Manager", value: "Store Manager" },
  { label: "Store Employee", value: "Store Employee" }
];

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function UserNew() {
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();

  // --------------------------------------------------
  // STATE: form fields
  // --------------------------------------------------
  // Canonical field state for the user being created
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [storeId, setStoreId] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Show/hide password flag for the initial password input
  const [showPassword, setShowPassword] = useState(false);

  // --------------------------------------------------
  // STATE: lookups and UI flags
  // --------------------------------------------------
  const [organizationOptions, setOrganizationOptions] = useState([{ label: "Select organization", value: "" }]);
  const [storeOptions, setStoreOptions] = useState([{ label: "Select store", value: "" }]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // ROLE-BASED FLAGS (derived from logged in user)
  // --------------------------------------------------
  const roles = (loggedInUser?.roles || []).map(String);
  const isAppAdmin = roles.includes("Application Admin");
  const isOrgAdmin = roles.includes("Organization Admin");
  const isAccountant = roles.includes("Organization Accountant");
  const isStoreManager = roles.includes("Store Manager");
  const userOrgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;
  const userStoreId = loggedInUser?.storeId ?? loggedInUser?.StoreId ?? null;

  // --------------------------------------------------
  // EFFECT: preselect/lock fields based on caller role
  // --------------------------------------------------
  useEffect(() => {
    // Org Admin/Accountant: lock org to user's org
    if ((isOrgAdmin || isAccountant) && userOrgId) {
      setOrganizationId(String(userOrgId));
    }
    // Store Manager: lock org, store and role
    if (isStoreManager) {
      if (userOrgId) setOrganizationId(String(userOrgId));
      if (userStoreId) setStoreId(String(userStoreId));
      setRole("Store Employee");
    }
  }, [isOrgAdmin, isAccountant, isStoreManager, userOrgId, userStoreId]);

  // --------------------------------------------------
  // EFFECT: load organizations on mount
  // --------------------------------------------------
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

  // --------------------------------------------------
  // EFFECT: load stores when organization or role changes
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const roleRequiresStore = role === "Store Manager" || role === "Store Employee";

    const loadStores = async () => {
      setLoadingStores(true);
      setStoreOptions([{ label: "Select store", value: "" }]);
      try {
        const res = await fetch(`/api/stores/by-organization/${encodeURIComponent(organizationId)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load stores");
        const json = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(json) ? json : (json.items || []);
        const opts = [{ label: "Select store", value: "" }, ...arr.map(s => ({ label: s.storeName, value: String(s.storeId) }))];
        setStoreOptions(opts);
        setStoreId("");
      } catch (ex) {
        console.error("Load stores failed", ex);
        if (mounted) setError("Failed to load stores");
      } finally {
        if (mounted) setLoadingStores(false);
      }
    };

    if (organizationId && roleRequiresStore) {
      loadStores();
    } else {
      // if role changed to one that doesn't need a store, clear selection/options
      setStoreId("");
      setStoreOptions([{ label: "Select store", value: "" }]);
    }

    return () => { mounted = false; };
  }, [organizationId, role]);

  // --------------------------------------------------
  // ROLE: allowed role options for the role select control
  // --------------------------------------------------
  const allowedRoleOptions = (() => {
    if (isAppAdmin) return ROLE_OPTIONS; // full list
    if (isOrgAdmin || isAccountant) {
      return [
        { label: "Select role", value: "" },
        { label: "Organization Accountant", value: "Organization Accountant" },
        { label: "Store Manager", value: "Store Manager" },
        { label: "Store Employee", value: "Store Employee" }
      ];
    }
    if (isStoreManager) {
      return [
        { label: "Store Employee", value: "Store Employee" }
      ];
    }
    return [{ label: "Select role", value: "" }];
  })();

  // --------------------------------------------------
  // SUBMIT: validate inputs and POST to API
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Email is required.");
    if (!emailIsValid(email)) return setError("Provide a valid email address.");
    if (!initialPassword) return setError("Initial password is required.");
    if (!passwordIsValid(initialPassword)) return setError("Password must be at least 8 chars and include upper, lower and a digit.");
    if (role === "Application Admin") return setError("Cannot create Application Admin here.");

    // require role and organization (frontend validation)
    if (!role) return setError("Role is required.");
    if (!organizationId) {
      setSaving(false);
      return setError("Organization selection is required.");
    }

    const roleRequiresStore = role === "Store Manager" || role === "Store Employee";
    if (roleRequiresStore && !storeId) return setError("Store selection is required for the selected role.");

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

      navigate("/users", { state: { created: true, createdName: `${firstName} ${lastName}`.trim() || email } });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // LAYOUT FLAGS: disable/lock controls
  // --------------------------------------------------
  const storeDisabled = !(role === "Store Manager" || role === "Store Employee") || isStoreManager;
  const orgDisabled = (isOrgAdmin || isAccountant || isStoreManager) && !!userOrgId;
  const roleDisabled = isStoreManager; // fixed to Store Employee

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
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
            <SelectField label="Organization" required value={organizationId} onChange={setOrganizationId} options={organizationOptions} searchable={true} disabled={orgDisabled} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Role" required value={role} onChange={setRole} options={allowedRoleOptions} searchable={false} disabled={roleDisabled} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField
              key={`store-${organizationId}`}
              label="Store"
              value={storeId}
              onChange={setStoreId}
              options={storeOptions}
              searchable={true}
              disabled={storeDisabled}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            {/* Use InputWithButton to allow showing/hiding the initial password with eye icon */}
            <InputWithButton
              label="Initial Password"
              type={showPassword ? "text" : "password"}
              required
              value={initialPassword}
              onChange={setInitialPassword}
              placeholder="Temporary password"
              buttonLabel={showPassword ? <FaEyeSlash /> : <FaEye />}
              buttonVariant="secondary"
              onButtonClick={(ev) => { ev.preventDefault(); setShowPassword(s => !s); }}
            />
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