import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BiSolidBuildings } from "react-icons/bi";
import { FaPencilAlt } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import TimestampField from "../../components/Form/TimestampField";
import SwitchField from "../../components/Form/SwitchField";
import InputWithButton from "../../components/Form/InputWithButton";
import FormActions from "../../components/Form/FormActions";
import InfoModal from "../../components/Ui/InfoModal";

/*
  OrganizationEdit.jsx
  Summary:
  - Edit organization page: loads organization details and industry types,
    allows editing fields, validates on submit, and saves via PUT request.
*/

const emailIsValid = (e) => {
  if (!e) return false;
  return /^\S+@\S+\.\S+$/.test(String(e).trim());
};

// --------------------------------------------------
// COMPONENT: OrganizationEdit
// --------------------------------------------------
const OrganizationEdit = () => {
  // Router helpers
  const navigate = useNavigate();
  const { id } = useParams();

  // --------------------------------------------------
  // STATE: form fields
  // --------------------------------------------------
  // Organization basic fields
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industryTypeId, setIndustryTypeId] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [establishmentDate, setEstablishmentDate] = useState("");
  const [website, setWebsite] = useState("");
  const [isActive, setIsActive] = useState(true);

  // --------------------------------------------------
  // STATE: lookups / UI flags
  // --------------------------------------------------
  // Industry select options and loading flag
  const [industryOptions, setIndustryOptions] = useState([{ label: "Select industry", value: "" }]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);

  // Loading / saving / error UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Raw industry value returned by API (could be id or name)
  const [orgIndustryRaw, setOrgIndustryRaw] = useState(null);

  // Modal and pending state for deactivation
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [pendingActiveValue, setPendingActiveValue] = useState(true);

  // --------------------------------------------------
  // EFFECT: load organization details on mount (by id)
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!id) {
          setError("Missing organization id");
          return;
        }

        const res = await fetch(`/api/organizations/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }

        const json = await res.json();
        if (!mounted) return;

        // populate fields (API uses camelCase due to JSON naming policy)
        setOrgName(json.orgName ?? "");
        setEmail(json.email ?? "");
        setPhone(json.phone ?? "");
        // store raw industry info (could be id or name depending on API)
        const rawIndustry = (json.industryTypeId ?? json.industryTypeName) ?? null;
        setOrgIndustryRaw(rawIndustry);
        // If API provided an id, prefer that for immediate selection
        if (json.industryTypeId !== undefined && json.industryTypeId !== null) {
          setIndustryTypeId(String(json.industryTypeId));
        } else {
          // leave industryTypeId empty for now; a follow-up effect will map the raw name to an option
          setIndustryTypeId("");
        }
        setRegNumber(json.regestirationNumber ?? "");
        setEstablishmentDate(json.establishmentDate ? new Date(json.establishmentDate).toISOString().slice(0, 10) : "");
        setWebsite(json.websiteUrl ?? "");
        setIsActive(json.isActive !== undefined ? !!json.isActive : true);
      } catch (ex) {
        console.error("Failed to load organization", ex);
        if (mounted) setError(ex?.message || "Failed to load organization");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------------------------------
  // EFFECT: load industry types for the select control
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingIndustries(true);
      try {
        const res = await fetch("/api/organizations/industrytypes", { credentials: "include" });
        if (!res.ok) {
          const fallback = await fetch("/api/industrytypes", { credentials: "include" }).catch(() => null);
          if (!fallback || !fallback.ok) throw new Error("Failed to load industry types");
          const fallbackJson = await fallback.json();
          if (!mounted) return;
          const fallbackOpts = [{ label: "Select industry", value: "" }, ...(Array.isArray(fallbackJson) ? fallbackJson.map((it) => ({ label: it.industryTypeName, value: String(it.industryTypeId) })) : [])];
          setIndustryOptions(fallbackOpts);
          return;
        }

        const json = await res.json();
        if (!mounted) return;
        const opts = [{ label: "Select industry", value: "" }, ...(Array.isArray(json) ? json.map((it) => ({ label: it.industryTypeName, value: String(it.industryTypeId) })) : [])];
        setIndustryOptions(opts);
      } catch (err) {
        console.error("Load industry types failed", err);
      } finally {
        if (mounted) setLoadingIndustries(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // EFFECT: resolve raw industry value to a select option when available
  // --------------------------------------------------
  // When industry options or the raw org industry value become available,
  // try to resolve and select the matching option.
  useEffect(() => {
    if (!orgIndustryRaw) return;
    if (industryTypeId && industryTypeId !== "") return; // already set (by id)
    // try matching by value (id) first
    const byValue = industryOptions.find(o => o.value === String(orgIndustryRaw));
    if (byValue) {
      setIndustryTypeId(byValue.value);
      return;
    }
    // try matching by label (name)
    const byLabel = industryOptions.find(o => o.label === String(orgIndustryRaw));
    if (byLabel) {
      setIndustryTypeId(byLabel.value);
    }
  }, [orgIndustryRaw, industryOptions, industryTypeId]);

  // --------------------------------------------------
  // HELPERS: Open website and active toggle handlers
  // --------------------------------------------------
  const handleOpenWebsite = () => {
    if (!website || website.trim() === "") return;
    const href = website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
    window.open(href, "_blank", "noopener");
  };

  const handleActiveToggle = (checked) => {
    // if turning off, require confirmation modal
    if (!checked) {
      setPendingActiveValue(false);
      setShowDeactivateModal(true);
      return;
    }
    setIsActive(true);
  };

  const confirmDeactivate = () => {
    setIsActive(false);
    setShowDeactivateModal(false);
  };

  const cancelDeactivate = () => {
    setPendingActiveValue(true);
    setShowDeactivateModal(false);
  };

  // --------------------------------------------------
  // SUBMIT: validate and save changes
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!orgName.trim()) return setError("Organization name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!emailIsValid(email)) return setError("Provide a valid email address.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!industryTypeId || industryTypeId === "") return setError("Select an industry type.");
    // keep registration and establishment required like "New" form
    if (!regNumber.trim()) return setError("Registration number is required.");
    if (!establishmentDate) return setError("Establishment date is required.");

    setSaving(true);

    try {
      const payload = {
        orgId: Number(id),
        orgName: orgName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        industryTypeId: Number(industryTypeId),
        regestirationNumber: regNumber ? regNumber.trim() : null,
        establishmentDate: establishmentDate ? new Date(establishmentDate).toISOString() : null,
        websiteUrl: website ? website.trim() : null,
        isActive: Boolean(isActive)
      };

      const res = await fetch(`/api/organizations/${encodeURIComponent(id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      // navigate back to list and indicate an update occurred so list shows a success alert
      navigate("/organizations", { state: { updated: true, updatedName: payload.orgName } });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to save organization");
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
        icon={<BiSolidBuildings size={55} />}
        title="Edit Organization"
        descriptionLines={["Modify organization details. Deactivating will prevent users from signing in."]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6 text-start">
            <InputField label="Organization Name" required value={orgName} onChange={setOrgName} placeholder="Organization name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" required value={email} onChange={setEmail} placeholder="contact@org.example" />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" required value={phone} onChange={setPhone} placeholder="+973-3XX-XXXX" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Industry Type"
              required
              value={industryTypeId}
              onChange={setIndustryTypeId}
              options={industryOptions}
              searchable={false}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField label="Registration Number" required value={regNumber} onChange={setRegNumber} placeholder="Reg. number" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Establishment Date" required value={establishmentDate} onChange={setEstablishmentDate} />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputWithButton
              label="Website"
              value={website}
              onChange={setWebsite}
              placeholder="https://example.org"
              buttonLabel="Open"
              buttonVariant="secondary"
              onButtonClick={(ev) => { ev.preventDefault(); handleOpenWebsite(); }}
            />
          </div>

          <div className="col-12 col-md-6 text-start d-flex align-items-center">
            <div style={{ width: "100%" }}>
              <SwitchField label="Active Organization" checked={isActive} onChange={handleActiveToggle} />
            </div>
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/organizations")}
              submitLabel="Save Changes"
              loading={saving}
            />
          </div>
        </div>
      </FormBody>

      {/* Deactivation confirmation modal using shared InfoModal */}
      <InfoModal show={showDeactivateModal} title="Confirm Deactivation" onClose={cancelDeactivate}>
        <p>Deactivating this organization will prevent all users of the organization from signing in. Are you sure?</p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={cancelDeactivate}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDeactivate}>Deactivate Organization</button>
        </div>
      </InfoModal>
    </div>
  );
};

export default OrganizationEdit;
