import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBuilding, FaPlus } from "react-icons/fa";

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
  - Create new organization form (UI only). Submit handler intentionally left unimplemented.
  - Rows:
    1) Organization Name + Email
    2) Phone Number + Industry Type (dropdown)
    3) Registration Number + Establishment Date (date)
    4) Website URL (with Open button) + Active Organization (switch)
    5) Action buttons (Cancel / Save) -- Save is a stub.
*/

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingIndustries(true);
      try {
        const res = await fetch("/api/industrytypes", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load industry types");
        const json = await res.json();
        if (!mounted) return;
        const opts = [{ label: "Select industry", value: "" }, ...(Array.isArray(json) ? json.map((it) => ({ label: it.industryTypeName ?? it.IndustryTypeName ?? String(it), value: String(it.industryTypeId ?? it.IndustryTypeId ?? it.id ?? "") })) : [])];
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

  // Submit intentionally not implemented per instructions.
  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: implement submit (left intentionally unimplemented)
    console.log("Submit not implemented. Form values:", { orgName, email, phone, industryTypeId, regNumber, establishmentDate, website, isActive });
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaBuilding size={28} />}
        title="Add Organization"
        descriptionLines={[
          "Create a new organization record. Fill the form and save.",
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
          <div className="col-12 col-md-8 text-start">
            <InputWithButton
              label="Website"
              value={website}
              onChange={setWebsite}
              placeholder="https://example.org"
              buttonLabel="Open"
              buttonVariant="secondary"
              onButtonClick={(e) => { e.preventDefault(); handleOpenWebsite(); }}
            />
          </div>
          <div className="col-12 col-md-4 text-start d-flex align-items-center">
            <div style={{ width: "100%" }}>
              <SwitchField label="Active Organization" checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          {/* Row 5: Actions */}
          <div className="col-12 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate("/organizations")}
              submitLabel="Save Organization"
              loading={false}
            />
          </div>

        </div>
      </FormBody>
    </div>
  );
};

export default OrganizationNew;