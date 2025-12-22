import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineInventory } from "react-icons/md";
import PageHeader from '../../components/Listing/PageHeader';
import FormBody from '../../components/Form/FormBody';
import SelectField from '../../components/Form/SelectField';
import InputField from '../../components/Form/InputField';
import FieldWrapper from '../../components/Form/FieldWrapper';
import FormActions from '../../components/Form/FormActions';

// --------------------------------------------------
// RestockItemsPage
// Summary:
// - UI page to restock inventory items for the current store.
// - Loads inventory items into a selector, allows entering an added quantity,
//   performs a POST to restock, and updates the local list optimistically.
// --------------------------------------------------
export default function RestockItemsPage() {
  const navigate = useNavigate();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  // list of inventory items returned from the API
  const [items, setItems] = useState([]);
  // select options built from items
  const [itemOptions, setItemOptions] = useState([{ label: 'Select an item', value: '' }]);
  // selected item id and resolved selected item object
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // input quantity to add for the selected item
  const [inputQuantity, setInputQuantity] = useState('');
  // loading / error / info UI flags
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  // Helper to build select options from a list using provided keys
  const mapOptions = (list, labelKey, valueKey) =>
    (list || []).map((i) => ({ label: i[labelKey] ?? i.inventoryItemName ?? i.name ?? String(i), value: String(i[valueKey] ?? i.inventoryItemId ?? i.id ?? '') }));

  // --------------------------------------------------
  // EFFECT: load inventory items for selector
  // --------------------------------------------------
  // Request a large page size so we get most items.
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

        // normalize items list from response
        const list = Array.isArray(json.items) ? json.items : [];
        setItems(list);

        // build select options (keep default first entry)
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

  // --------------------------------------------------
  // EFFECT: update selectedItem when selection changes
  // --------------------------------------------------
  useEffect(() => {
    if (!selectedItemId) {
      // clear selection-related UI when no item chosen
      setSelectedItem(null);
      setInputQuantity('');
      return;
    }
    // find the selected item in the loaded items list
    const found = items.find(it => String(it.inventoryItemId ?? it.id ?? '') === String(selectedItemId));
    setSelectedItem(found || null);
    setInputQuantity('');
  }, [selectedItemId, items]);

  // --------------------------------------------------
  // DATA PROCESSING: quantity calculations
  // --------------------------------------------------
  // previous/current quantity for selected item
  const prevQuantity = selectedItem?.quantity ?? 0;
  // parse the user input quantity safely (allow empty string => 0)
  const parsedInputQty = (() => {
    const v = inputQuantity === '' ? 0 : Number(String(inputQuantity).replace(/,/g, ''));
    return Number.isFinite(v) ? v : 0;
  })();
  // total after restock (display only)
  const totalQuantity = (Number(prevQuantity ?? 0) || 0) + parsedInputQty;

  // --------------------------------------------------
  // SUBMIT: perform restock POST (UI-only) and optimistic update
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!selectedItem) {
      setError('Select an item first.');
      return;
    }
    if (parsedInputQty <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }

    try {
      const res = await fetch(`/api/inventoryitems/${encodeURIComponent(selectedItem.inventoryItemId)}/restock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addedQuantity: parsedInputQty })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to restock item (${res.status})`);
      }
      const resp = await res.json().catch(() => ({}));
      const newQty = resp?.quantity ?? totalQuantity;

      // Optimistically update local state so UI reflects the change immediately
      setItems(prev =>
        prev.map(it =>
          String(it.inventoryItemId) === String(selectedItem.inventoryItemId)
            ? { ...it, quantity: newQty, updatedAt: new Date().toISOString() }
            : it
        )
      );
      setSelectedItem(si => si ? { ...si, quantity: newQty } : si);
      setInputQuantity('');
        setInfo('Quantity updated successfully. You can continue entering quantities for other items.');

        // Automatically clear the alert after 5 seconds
        setTimeout(() => {
            setInfo('');
        }, 3500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to restock item');
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
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
              <div className="alert alert-danger text-start">Error: {error}</div>
            </div>
          )}

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

      {info && (
        <div className="alert alert-success text-start mt-4">
          {info}
        </div>
      )}
    </div>
  );
}