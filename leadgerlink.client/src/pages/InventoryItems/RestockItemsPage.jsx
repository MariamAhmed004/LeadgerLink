import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineInventory } from "react-icons/md";
import PageHeader from '../../components/Listing/PageHeader';
import FormBody from '../../components/Form/FormBody';
import SelectField from '../../components/Form/SelectField';
import InputField from '../../components/Form/InputField';
import FieldWrapper from '../../components/Form/FieldWrapper';
import FormActions from '../../components/Form/FormActions';

// RestockItemsPage - uses shared form components; UI + lookups only (no submit)
export default function RestockItemsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [itemOptions, setItemOptions] = useState([{ label: 'Select an item', value: '' }]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const [inputQuantity, setInputQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to build select options
  const mapOptions = (list, labelKey, valueKey) =>
    (list || []).map((i) => ({ label: i[labelKey] ?? i.inventoryItemName ?? i.name ?? String(i), value: String(i[valueKey] ?? i.inventoryItemId ?? i.id ?? '') }));

  // Load inventory items (for the selector). Request a large page size so we get most items.
  useEffect(() => {
    let mounted = true;
    const loadItems = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', {
          credentials: 'include'
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || 'Failed to load inventory items');
        }
        const json = await res.json();
        if (!mounted) return;

        const list = Array.isArray(json.items) ? json.items : [];
        setItems(list);

        const opts = [{ label: 'Select an item', value: '' }, ...mapOptions(list, 'inventoryItemName', 'inventoryItemId')];
        setItemOptions(opts);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load items');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadItems();
    return () => { mounted = false; };
  }, []);

  // Update selectedItem when selectedItemId changes
  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }
    const found = items.find(it => String(it.inventoryItemId ?? it.id ?? '') === String(selectedItemId));
    setSelectedItem(found || null);
    // reset typed quantity when selecting new item
    setInputQuantity('');
  }, [selectedItemId, items]);

  const prevQuantity = selectedItem?.quantity ?? 0;
  const parsedInputQty = (() => {
    const v = inputQuantity === '' ? 0 : Number(String(inputQuantity).replace(/,/g, ''));
    return Number.isFinite(v) ? v : 0;
  })();
  const totalQuantity = (Number(prevQuantity ?? 0) || 0) + parsedInputQty;

  // submit handler (UI-only for now)
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Save (not implemented):', {
      inventoryItemId: selectedItemId,
      addedQuantity: parsedInputQty,
      previousQuantity: prevQuantity,
      totalQuantity
    });
  };

  return (
    <div className="container py-5">
      <PageHeader
              icon={<MdOutlineInventory size={55} />}
        title="Restock Items"
        descriptionLines={[
            'Fill In the form to increase the quantity of an item that is registered in the store.', "You can increase quantities of items previously registered in the inventory. \n For each item you want to restock add the quantity added then save it." 
        ]}
        actions={[]}
      />

      <FormBody onSubmit={handleSubmit} plain={true}>
        <div className="row gx-4 gy-4">
          {loading && (
            <div className="col-12">
              <div className="text-muted">Loading items...</div>
            </div>
          )}

          {error && (
            <div className="col-12">
              <div className="text-danger">Error: {error}</div>
            </div>
          )}

          {/* Row 1: item select + readonly unit */}
                  <div className="col-12 col-md-6 text-start">
                      <SelectField
                          searchable
              label="Inventory Item"
              value={selectedItemId}
              onChange={setSelectedItemId}
              options={[{ label: 'Select an item', value: '' }, ...itemOptions.slice(1)]}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <FieldWrapper label="Unit">
              <input
                type="text"
                className="form-control text-start"
                readOnly
                value={selectedItem?.unitName ?? selectedItem?.unit ?? ''}
                placeholder="Unit will appear here"
              />
            </FieldWrapper>
          </div>

          <div className="col-12 my-3" />

          {/* Row 2: quantity input + calculation display */}
          <div className="col-12 col-md-6">
            <InputField
                          label="Quantity to add"
                          type="number"
                          step="0.001"
                          min="0"
                          value={inputQuantity}
                          onChange={setInputQuantity}
                          placeholder="Enter quantity"
                          required={false}
                          className={"text-start"}
            />
          </div>

          <div className="col-12 col-md-6">
                      <FieldWrapper label="Result" className={"text-start"}>
              <div className="border rounded p-2 ">
                              <div>
                                  Total after restock: <strong>{Number(prevQuantity ?? 0).toFixed(3)}</strong> +  <strong>{parsedInputQty.toFixed(3)}</strong> =  <strong>{totalQuantity.toFixed(3)}</strong>
                              </div>
              </div>
            </FieldWrapper>
          </div>

          {/* Action buttons */}
          <div className="col-12 col-md-6 offset-md-6 d-flex justify-content-end">
            <FormActions
              onCancel={() => navigate('/inventory')}
              submitLabel="Save"
              loading={false}
              disabled={!selectedItem || parsedInputQty <= 0}
            />
          </div>
        </div>
      </FormBody>
    </div>
  );
}