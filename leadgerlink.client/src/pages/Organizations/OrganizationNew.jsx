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
  SUMMARY:
  - Page for creating a new organization.
  - Loads industry type options, performs client-side validation, posts payload to server,
    and navigates back to the organizations list on success.
*/

// --------------------------------------------------
// STATE DECLARATIONS
// --------------------------------------------------

// Simple email validator used by submit logic
const emailIsValid = (e) => {
  if (!e) return false;
  return /^\S+@\S+\.\S+$/.test(String(e).trim());
};

const OrganizationNew = () => {
  // router navigation helper
  const navigate = useNavigate();

  // --- form field values ---
  // Organization name field
  const [orgName, setOrgName] = useState("");
  // Contact email for the organization
  const [email, setEmail] = useState("");
  // Contact phone number
  const [phone, setPhone] = useState("");
  // Selected industry type id (string value used by SelectField)
  const [industryTypeId, setIndustryTypeId] = useState("");
  // Registration number
  const [regNumber, setRegNumber] = useState("");
  // Establishment date (ISO date string)
  const [establishmentDate, setEstablishmentDate] = useState("");
  // Website URL (optional)
  const [website, setWebsite] = useState("");
  // Whether organization is active
  const [isActive, setIsActive] = useState(true);

  // --- lookup/options & loading ---
  // Options for the industry select
  const [industryOptions, setIndustryOptions] = useState([{ label: "Select industry", value: "" }]);
  // Loading flag for industry types fetch
  const [loadingIndustries, setLoadingIndustries] = useState(false);

  // --- submission state ---
  // Saving indicator while POST is in progress
  const [saving, setSaving] = useState(false);
  // Error message shown to the user on validation or save failure
  const [error, setError] = useState("");

  // --------------------------------------------------
  // EFFECTS: DATA FETCHING
  // --------------------------------------------------

  // Load industry types on mount (with fallback endpoint)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingIndustries(true);
      try {
        // Try preferred organizations controller endpoint first
        const res = await fetch("/api/organizations/industrytypes", { credentials: "include" });
        if (!res.ok) {
          // Fallback: try generic industrytypes endpoint if first fails
          const fallback = await fetch("/api/industrytypes", { credentials: "include" }).catch(() => null);
          if (!fallback || !fallback.ok) throw new Error("Failed to load industry types");
          const fallbackJson = await fallback.json();
          if (!mounted) return;
          const fallbackOpts = [{ label: "Select industry", value: "" }, ...(Array.isArray(fallbackJson) ? fallbackJson.map((it) => ({ label: it.industryTypeName, value: String(it.industryTypeId) })) : [])];
          setIndustryOptions(fallbackOpts);
          return;
        }

        // Parse and set options when primary endpoint succeeds
        const json = await res.json();
        if (!mounted) return;
        const opts = [{ label: "Select industry", value: "" }, ...(Array.isArray(json) ? json.map((it) => ({ label: it.industryTypeName, value: String(it.industryTypeId) })) : [])];
        setIndustryOptions(opts);
      } catch (err) {
        // Keep default option on failure; log for diagnostics
        console.error("Load industry types failed", err);
      } finally {
        if (mounted) setLoadingIndustries(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  // Opens website in a new tab, normalizing scheme if required
  const handleOpenWebsite = () => {
    if (!website || website.trim() === "") return;
    const href = website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
    window.open(href, "_blank", "noopener");
  };

  // --------------------------------------------------
  // SUBMIT HANDLER
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Reset prior error before validating
    setError("");

    // Basic required-field validation (ALL fields required except website)
    if (!orgName.trim()) return setError("Organization name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!emailIsValid(email)) return setError("Provide a valid email address.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!industryTypeId || industryTypeId === "") return setError("Select an industry type.");
    if (!regNumber.trim()) return setError("Registration number is required.");
    if (!establishmentDate) return setError("Establishment date is required.");
    // website is intentionally optional (no validation)

    // Start saving indicator and prepare payload
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
        websiteUrl: website ? website.trim() : null,
        isActive: Boolean(isActive)
      };

      // POST new organization
      const res = await fetch("/api/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Handle non-OK responses with server message if available
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
      // Surface user-friendly error; log full error to console
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
      {/* Page header with icon, title and short description */}
      <PageHeader
              icon={<BiSolidBuildings size={55} />}
        title="Add Organization"
        descriptionLines={[
            "Add a new organization after the contract with LedgerLink:",
          "Fill in the organization details to register the organization and start onboarding."
        ]}
        actions={[]}
      />

      {/* Form body: uses FormBody wrapper and grid for fields */}
      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">

          {/* Row 1: Organization Name + Email */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Organization Name" required value={orgName} onChange={setOrgName} placeholder="Organization name" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <InputField label="Email" type="email" required value={email} onChange={setEmail} placeholder="contact@org.example" />
          </div>

          {/* Row 2: Phone Number + Industry Type */}
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

          {/* Row 3: Registration Number + Establishment Date */}
          <div className="col-12 col-md-6 text-start">
            <InputField label="Registration Number" required value={regNumber} onChange={setRegNumber} placeholder="Reg. number" />
          </div>
          <div className="col-12 col-md-6 text-start">
            <TimestampField label="Establishment Date" required value={establishmentDate} onChange={setEstablishmentDate} />
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