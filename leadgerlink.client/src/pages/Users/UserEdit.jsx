import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiUsers } from "react-icons/hi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";
import InfoModal from "../../components/Ui/InfoModal";
import { AuthContext } from "../../Context/AuthContext";

/*
  UserEdit.jsx
  Summary:
  - Edit a user profile. Loads user and lookup data, provides UI to change name,
    phone, store assignment and active state. Handles store manager reassignment
    and deactivation confirmation via modals. Saves changes with PUT /api/users/{id}.
*/

// --------------------------------------------------
// COMPONENT: UserEdit
// --------------------------------------------------
export default function UserEdit() {
  // Router/navigation helpers and current user context
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext); // Access the current user from AuthContext

  // --------------------------------------------------
  // STATE: form fields and flags
  // --------------------------------------------------
  // Editable user fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [storeId, setStoreId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [reassignStoreManager, setReassignStoreManager] = useState(false);

  // Lookup lists and auxiliary UI state
  const [organizationOptions, setOrganizationOptions] = useState([{ label: "Select organization", value: "" }]);
  const [storeOptions, setStoreOptions] = useState([{ label: "Select store", value: "" }]);
  const [storeManagers, setStoreManagers] = useState({}); // { storeId: { userId, name } }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal and pending state for deactivation and reassignment flows
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [pendingActive, setPendingActive] = useState(true);
  const [showStoreManagerModal, setShowStoreManagerModal] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [storeManagerToUnassign, setStoreManagerToUnassign] = useState(null);

  // --------------------------------------------------
  // DERIVED FLAGS
  // --------------------------------------------------
  // Controls whether the store select is editable based on the user's role
  const canEditStore = role.trim().toLowerCase() === "store manager" || role.trim().toLowerCase() === "store employee";
  const isStoreManagerRole = role.trim().toLowerCase() === "store manager";

  // --------------------------------------------------
  // EFFECT: load user and lookups on mount / when id changes
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    let loadedOrgId = "";
    let loadedStoreId = "";

    // Load specific user details
    const loadUser = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load user (${res.status})`);
        }
        const json = await res.json();
        if (!mounted) return;
        // Populate editable fields from returned DTO (handles multiple naming variants)
        setEmail(json.email || "");
        setPhone(json.phone || "");
        setFirstName((json.firstName ?? ((json.fullName || "").split(" ")[0] || "")) || "");
        setLastName((json.lastName ?? ((json.fullName || "").split(" ").slice(1).join(" ") || "")) || "");
        loadedOrgId = json.orgId ? String(json.orgId) : json.organizationId ? String(json.organizationId) : "";
        setOrganizationId(loadedOrgId);
        setRole(json.role || "");
        loadedStoreId = json.storeId ? String(json.storeId) : "";
        setStoreId(loadedStoreId);
        setIsActive(json.isActive === true);
        setPendingActive(json.isActive === true);
      } catch (ex) {
        if (mounted) setError(ex.message || "Failed to load user");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Load lookup lists (organizations and stores) after loading user
    const loadLookups = async () => {
      try {
        const currentOrgId = currentUser?.orgId ? String(currentUser.orgId) : ""; // Get orgId from AuthContext
        const orgRes = await fetch("/api/organizations", { credentials: "include" });
        if (orgRes.ok) {
          const arr = await orgRes.json();
          const list = Array.isArray(arr) ? arr : (arr.items || []);
          setOrganizationOptions([{ label: "Select organization", value: "" }, ...list.map(o => ({ label: o.orgName, value: String(o.orgId) }))]);
        }
        if (loadedOrgId || currentOrgId) {
          const storesRes = await fetch(`/api/stores/by-organization/${encodeURIComponent(loadedOrgId || currentOrgId)}`, { credentials: "include" });
          if (storesRes.ok) {
            const arr = await storesRes.json();
            const list = Array.isArray(arr) ? arr : (arr.items || []);
            const options = [{ label: "Select store", value: "" }, ...list.map(s => ({ label: s.storeName, value: String(s.storeId) }))];
            setStoreOptions(options);
            // Build storeManagers map used to detect conflicts when assigning a store manager
            const managers = {};
            list.forEach(s => {
              if (s.userId && s.managerName) {
                managers[String(s.storeId)] = { userId: s.userId, name: s.managerName };
              }
            });
            setStoreManagers(managers);
            if (loadedStoreId) setStoreId(loadedStoreId);
          }
        }
      } catch { /* ignore */ }
    };

    loadUser().then(loadLookups);
    return () => { mounted = false; };
  }, [id, currentUser]);

  // --------------------------------------------------
  // MODAL FLOWS: deactivation
  // --------------------------------------------------
  // Intercept deactivation and show modal
  const handleActiveChange = (val) => {
    if (!val) {
      setShowDeactivateModal(true);
      setPendingActive(false);
    } else {
      setPendingActive(true);
    }
  };

  const confirmDeactivate = () => {
    setShowDeactivateModal(false);
    setPendingActive(false);
  };

  const cancelDeactivate = () => {
    setShowDeactivateModal(false);
    setPendingActive(true);
  };

  // --------------------------------------------------
  // MODAL FLOWS: store manager reassignment
  // --------------------------------------------------
  // Intercept store change for Store Manager role to handle reassignment confirmation
  const handleStoreChange = (newStoreId) => {
    if (isStoreManagerRole && newStoreId && newStoreId !== storeId) {
      const manager = storeManagers[newStoreId];
      if (manager && manager.userId !== id) {
        setStoreManagerToUnassign(manager);
        setPendingStoreId(newStoreId);
        setShowStoreManagerModal(true);
        setReassignStoreManager(true);
        return;
      }
    }
    setStoreId(newStoreId);
    setReassignStoreManager(false);
  };

  const confirmStoreManagerChange = () => {
    setStoreId(pendingStoreId);
    setShowStoreManagerModal(false);
    setReassignStoreManager(true);
  };

  const cancelStoreManagerChange = () => {
    setShowStoreManagerModal(false);
    setPendingStoreId("");
    setStoreManagerToUnassign(null);
  };

  // --------------------------------------------------
  // SUBMIT: save changes
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        isActive: Boolean(pendingActive),
        storeId: canEditStore && storeId ? Number(storeId) : undefined,
        reassignStoreManager: reassignStoreManager || undefined
      };
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to update user (${res.status})`);
      }
      navigate(`/users/${id}`);
    } catch (ex) {
      setError(ex.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<HiUsers size={55} />}
        title="Edit User"
        descriptionLines={["Update user information. No changes will be done until save button is clicked ."]}
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
            <InputField label="Email" type="email" required value={email} onChange={() => {}} placeholder="user@example.com" disabled />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+973-3XX-XXXX" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Organization" value={organizationId} onChange={() => {}} options={organizationOptions} searchable={true} disabled />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Role" value={role} onChange={() => {}} options={[{ label: role || "", value: role || "" }]} searchable={false} disabled />
          </div>

          <div className="col-12 col-md-6 text-start">
            <SelectField label="Store" value={storeId} onChange={handleStoreChange} options={storeOptions} searchable={true} disabled={!canEditStore} />
          </div>

          <div className="col-12 col-md-4 text-start d-flex align-items-center">
            <SwitchField label="Active User" checked={pendingActive} onChange={handleActiveChange} />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate(`/users/${id}`)}
              submitLabel="Save Changes"
              loading={saving}
            />
          </div>
        </div>
      </FormBody>

      <InfoModal show={showDeactivateModal} title="Confirm Deactivation" onClose={cancelDeactivate}>
        <p>Deactivating this user account will prevent the user from logging in to the system. Are you sure you want to proceed?</p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={cancelDeactivate}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDeactivate}>Deactivate</button>
        </div>
      </InfoModal>

      <InfoModal show={showStoreManagerModal} title="Confirm Store Manager Reassignment" onClose={cancelStoreManagerChange}>
        <p>
          The selected store already has a store manager assigned (<strong>{storeManagerToUnassign?.name}</strong>).<br />
          If you proceed, <strong>{storeManagerToUnassign?.name}</strong> will be unassigned from this store and deactivated, and this user will be assigned as the new store manager.
        </p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={cancelStoreManagerChange}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmStoreManagerChange}>Proceed</button>
        </div>
      </InfoModal>
    </div>
  );
}
