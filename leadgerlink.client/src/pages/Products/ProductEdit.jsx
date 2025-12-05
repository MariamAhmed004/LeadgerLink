import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BiSolidPackage } from "react-icons/bi";
import { FaSave } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import FormBody from "../../components/Form/FormBody";
import InputField from "../../components/Form/InputField";
import SelectField from "../../components/Form/SelectField";
import FormActions from "../../components/Form/FormActions";
import TextArea from "../../components/Form/TextArea";

// Page for editing limited product details: VAT, Selling Price and Description
const ProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [vatCategoryId, setVatCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [description, setDescription] = useState("");

  const [vatOptions, setVatOptions] = useState([{ label: "Select VAT Applicable", value: "" }]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!id) throw new Error("Missing product id");

        // fetch product details
        const pRes = await fetch(`/api/products/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!pRes.ok) {
          const txt = await pRes.text().catch(() => null);
          throw new Error(txt || `Failed to load product (${pRes.status})`);
        }
        const pJson = await pRes.json();
        if (!mounted) return;

        setVatCategoryId(pJson.vatCategoryId ? String(pJson.vatCategoryId) : "");
        setSellingPrice(pJson.sellingPrice != null ? String(Number(pJson.sellingPrice).toFixed(3)) : "");
        setDescription(pJson.description ?? "");

        // load VAT categories (reuse existing endpoint if present)
        try {
          const vRes = await fetch('/api/vatcategories', { credentials: 'include' });
          if (vRes.ok) {
            const vJson = await vRes.json();
            if (!mounted) return;
            const opts = [{ label: "Select VAT Applicable", value: "" }, ...(Array.isArray(vJson) ? vJson.map(v => ({ label: v.name ?? v.vatName ?? `VAT ${v.id}`, value: String(v.vatCategoryId ?? v.id) })) : [])];
            setVatOptions(opts);
          }
        } catch (e) {
          console.warn('Failed to load VAT categories', e);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err?.message || 'Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!vatCategoryId) return setError("Select VAT category");
    if (!sellingPrice || isNaN(Number(sellingPrice))) return setError("Provide a valid selling price");

    setSaving(true);
    try {
      const payload = {
        productId: Number(id),
        vatCategoryId: Number(vatCategoryId),
        sellingPrice: Number(Number(sellingPrice).toFixed(3)),
        description: description || null
      };

      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to save product (${res.status})`);
      }

      navigate('/products', { state: { updated: true, updatedName: `Product ${id}` } });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<BiSolidPackage size={55} />}
        title="Edit Product Details"
        descriptionLines={["Utilize the form to edit a product details in the store:", "The recipe will be utilized to enter sales if it is on sale, and for managing inventory items (deducting and calculating values)"]}
      />

      <FormBody onSubmit={handleSubmit} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <SelectField label="VAT" value={vatCategoryId} onChange={setVatCategoryId} options={vatOptions} />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Selling Price (BHD)" value={sellingPrice} onChange={setSellingPrice} placeholder="XX.XXX BHD" inputProps={{ inputMode: 'decimal' }} />
          </div>

          <div className="col-12">
            {/* description textarea using shared TextArea component */}
            <TextArea label="Product Description" value={description} onChange={setDescription} rows={5} />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-end">
            <FormActions onCancel={() => navigate('/products')} submitLabel="Save" loading={saving} />
          </div>
        </div>
      </FormBody>
    </div>
  );
};

export default ProductEdit;
