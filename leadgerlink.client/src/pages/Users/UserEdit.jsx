import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiUsers } from "react-icons/hi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import SwitchField from "../../components/Form/SwitchField";
import FormActions from "../../components/Form/FormActions";

export default function UserEdit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [storeId, setStoreId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [organizationOptions, setOrganizationOptions] = useState([{ label: "Select organization", value: "" }]);
  const [storeOptions, setStoreOptions] = useState([{ label: "Select store", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
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
        setEmail(json.email || "");
        setPhone(json.phone || "");
        setFirstName((json.fullName || "").split(" ")[0] || "");
        setLastName((json.fullName || "").split(" ").slice(1).join(" ") || "");
        setOrganizationId(json.organizationId ? String(json.organizationId) : "");
        setRole(json.role || "");
        setStoreId(json.storeId ? String(json.storeId) : "");
        setIsActive(json.isActive === true);
      } catch (ex) {
        if (mounted) setError(ex.message || "Failed to load user");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadLookups = async () => {
      try {
        const orgRes = await fetch("/api/organizations", { credentials: "include" });
        if (orgRes.ok) {
          const arr = await orgRes.json();
          const list = Array.isArray(arr) ? arr : (arr.items || []);
          setOrganizationOptions([{ label: "Select organization", value: "" }, ...list.map(o => ({ label: o.orgName, value: String(o.orgId) }))]);
        }
        if (organizationId) {
          const storesRes = await fetch(`/api/stores/by-organization/${encodeURIComponent(organizationId)}`, { credentials: "include" });
          if (storesRes.ok) {
            const arr = await storesRes.json();
            const list = Array.isArray(arr) ? arr : (arr.items || []);
            setStoreOptions([{ label: "Select store", value: "" }, ...list.map(s => ({ label: s.storeName, value: String(s.storeId) }))]);
          }
        }
      } catch { /* ignore */ }
    };

    loadUser().then(loadLookups);
    return () => { mounted = false; };
  }, [id, organizationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        isActive: Boolean(isActive)
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

  return (
    <div className="container py-5">
      <PageHeader
        icon={<HiUsers size={55} />}
        title="Edit User"
        descriptionLines={["Update user basic information. Email, role, organization and store are immutable here."]}
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
            <SelectField label="Store" value={storeId} onChange={() => {}} options={storeOptions} searchable={true} disabled />
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
              onCancel={() => navigate(`/users/${id}`)}
              submitLabel="Save Changes"
              loading={saving}
            />
          </div>
        </div>
      </FormBody>
    </div>
  );
}
