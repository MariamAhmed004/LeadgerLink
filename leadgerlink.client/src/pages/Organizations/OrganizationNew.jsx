import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BiSolidBuildings } from "react-icons/bi";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import TimestampField from "../../components/Form/TimestampField";
import SwitchField from "../../components/Form/SwitchField";
import InputWithButton from "../../components/Form/InputWithButton";
import FormActions from "../../components/Form/FormActions";

/*
  OrganizationNew.jsx
  - Create new organization form. Implemented submit logic:
    - Validate no empty fields
    - Basic email validation
    - POST to /api/organizations
    - Load industry types from /api/organizations/industrytypes
*/

const emailIsValid = (e) => {
  if (!e) return false;
  return /^\S+@\S+\.\S+$/.test(String(e).trim());
};

const OrganizationNew = () => {
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industryTypeId, setIndustryTypeId] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [establishmentDate, setEstablishmentDate] = useState("");
  const [website, setWebsite] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [industryOptions, setIndustryOptions] = useState([{ label: "Select industry", value: "" }]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingIndustries(true);
      try {
        // Use organizations controller endpoint that returns industry types backed by repository
        // (fallback to /api/industrytypes if your API exposes that instead)
        const res = await fetch("/api/organizations/industrytypes", { credentials: "include" });
        if (!res.ok) {
          // fallback attempt
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
        // keep default option on failure
        console.error("Load industry types failed", err);
      } finally {
        if (mounted) setLoadingIndustries(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const handleOpenWebsite = () => {
    if (!website || website.trim() === "") return;
    const href = website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
    window.open(href, "_blank", "noopener");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic required-field validation
    if (!orgName.trim()) return setError("Organization name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!emailIsValid(email)) return setError("Provide a valid email address.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!industryTypeId || industryTypeId === "") return setError("Select an industry type.");
    if (!regNumber.trim()) return setError("Registration number is required.");
    if (!website.trim()) return setError("Website URL is required.");

    setSaving(true);

    try {
      const payload = {
        orgName: orgName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        industryTypeId: Number(industryTypeId),
        industryType: { industryTypeId: Number(industryTypeId) }, // keeps compatibility if server requires nav object
        regestirationNumber: regNumber.trim(),
        establishmentDate: establishmentDate ? new Date(establishmentDate).toISOString() : null,
        websiteUrl: website.trim(),
        isActive: Boolean(isActive)
      };

      const res = await fetch("/api/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      // parse created organization (controller returns detail DTO)
      const created = await res.json().catch(() => null);

      // navigate to list and pass small success state (name optional)
      const createdName = created?.orgName ?? payload.orgName;
      navigate("/organizations", { state: { created: true, createdName } });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to save organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-5">
      <PageHeader
              icon={<BiSolidBuildings size={55} />}
        title="Add Organization"
        descriptionLines={[
            "Following organization are contracted with LedgerLink:",
          "Click on the organization name to view its details"
        ]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">

          {/* Row 1: Organization Name + Email */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Organization Name" required value={orgName} onChange={setOrgName} placeholder="Organization name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="contact@org.example" />
          </div>

          {/* Row 2: Phone Number + Industry Type */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+973-3XX-XXXX" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <SelectField
              label="Industry Type"
              value={industryTypeId}
              onChange={setIndustryTypeId}
              options={industryOptions}
              searchable={false}
            />
          </div>

          {/* Row 3: Registration Number + Establishment Date */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Registration Number" value={regNumber} onChange={setRegNumber} placeholder="Reg. number" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Establishment Date" value={establishmentDate} onChange={setEstablishmentDate} />
          </div>

          {/* Row 4: Website URL (with Open button) + Active Organization (switch) */}
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
              <SwitchField label="Active Organization" checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}

          {/* Row 5: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/organizations")}
              submitLabel="Save Organization"
              loading={saving}
            />
          </div>

        </div>
      </FormBody>
    </div>
  );
};

export default OrganizationNew;