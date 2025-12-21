import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaExchangeAlt } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FormBody from '../../components/Form/FormBody';
import SelectField from '../../components/Form/SelectField';
import InputField from '../../components/Form/InputField';
import TabbedMenu from '../../components/Form/TabbedMenu';
import MenuTabCard from '../../components/Form/MenuTabCard';
import TextArea from '../../components/Form/TextArea';
import InfoModal from '../../components/Ui/InfoModal';

/*
  InventoryTransferSend.jsx
  Summary:
  - Review and send an existing inventory transfer request.
  - Loads transfer details and available recipes/inventory, allows the sender to
    adjust quantities and metadata, then sends the request by updating the transfer.
*/

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function InventoryTransferSend() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --------------------------------------------------
  // STATE: form fields and UI flags
  // --------------------------------------------------
  // requester and source store ids (strings for SelectField binding)
  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  // date and notes editable before sending
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // STATE: lookups, tabs and selection
  // --------------------------------------------------
  // store select options
  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  // selected items (from TabbedMenu) and tab data
  const [selection, setSelection] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);

  // maps of requested quantities (populated from transfer detail)
  const [requestedQtyByRecipe, setRequestedQtyByRecipe] = useState({});
  const [requestedQtyByInventory, setRequestedQtyByInventory] = useState({});

  // confirmation modal and error for send flow
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendError, setSendError] = useState('');

  // --------------------------------------------------
  // EFFECT: load stores for selects
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      try {
        const res = await fetch('/api/stores', { credentials: 'include' });
        if (!res.ok) return;
        const arr = await res.json();
        if (!mounted) return;
        const opts = [{ label: 'Select store', value: '' }, ...(Array.isArray(arr) ? arr.map(s => ({ label: s.storeName, value: String(s.storeId) })) : [])];
        setStoreOptions(opts);
      } catch { /* noop */ }
    };
    loadStores();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // EFFECT: load transfer details and preselect requested quantities
  // --------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function loadTransfer() {
      try {
        const res = await fetch(`/api/inventorytransfers/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        // prefer id fields when available for select binding
        const requesterId = data?.requesterStoreId ?? data?.requesterId ?? null;
        const fromStoreId = data?.fromStoreId ?? data?.requestedFromStoreId ?? null;
        setRequester(requesterId != null ? String(requesterId) : '');
        setFromStore(fromStoreId != null ? String(fromStoreId) : '');
        setDate(data?.date ? new Date(data.date).toISOString().slice(0, 10) : date);
        setNotes(data?.notes ?? '');

        // build maps of requested quantities so tab items can show initialSelectedQty
        const itemsArr = Array.isArray(data?.items) ? data.items : [];
        const reqByRecipe = {};
        const reqByInv = {};
        itemsArr.forEach(it => {
          const qty = Number(it.quantity ?? 0);
          if (qty <= 0) return;
          const rid = it.recipeId ?? it.RecipeId ?? null;
          const iid = it.inventoryItemId ?? it.InventoryItemId ?? null;
          if (rid != null) reqByRecipe[String(rid)] = qty;
          if (iid != null) reqByInv[String(iid)] = qty;
        });

        // store the maps for tab initialization
        setRequestedQtyByRecipe(reqByRecipe);
        setRequestedQtyByInventory(reqByInv);
      } catch { /* noop */ }
    }
    if (id) loadTransfer();
    return () => { isMounted = false; };
  }, [id]);

  // --------------------------------------------------
  // EFFECT: load tab data (recipes + inventory items) and apply initial quantities
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch('/api/recipes/for-current-store', { credentials: 'include' }).catch(() => null),
          fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', { credentials: 'include' }).catch(() => null),
        ]);

        // map recipes and include initialSelectedQty from requestedQtyByRecipe
        if (mounted && recipesRes && recipesRes.ok) {
          const rlist = await recipesRes.json();
          const recipesArr = Array.isArray(rlist) ? rlist : [];
          setRecipeItems(recipesArr.map(r => {
            const recipeId = r.recipeId ?? r.RecipeId ?? null;
            const initialQty = recipeId != null ? Number(requestedQtyByRecipe[String(recipeId)] || 0) : 0;
            return {
              recipeId,
              name: r.recipeName ?? r.productName ?? 'Recipe',
              description: r.description ?? 'NA',
              price: r.sellingPrice != null ? (Number(r.sellingPrice).toFixed(3) + ' BHD') : 'NA',
              quantity: Number(r.availableQuantity ?? 0),
              imageUrl: r.imageUrl || '',
              initialSelectedQty: initialQty,
            };
          }));
        } else {
          setRecipeItems([]);
        }

        // map inventory items for Others tab and include initialSelectedQty
        if (mounted && itemsRes && itemsRes.ok) {
          const json = await itemsRes.json();
          const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
          setOtherItems((list || []).map(it => {
            const id = it.inventoryItemId ?? it.id ?? it.InventoryItemId;
            const initialQty = id != null ? Number(requestedQtyByInventory[String(id)] || 0) : 0;
            return {
              id,
              name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? 'Item',
              description: it.description ?? it.inventoryItemDescription ?? it.Description ?? '',
              price: Number(it.costPerUnit ?? it.CostPerUnit ?? 0) > 0 ? `${Number(it.costPerUnit ?? it.CostPerUnit ?? 0).toFixed(3)} BHD` : '',
              quantity: Number(it.quantity ?? it.Quantity ?? 0),
              imageUrl: it.imageUrl || '',
              initialSelectedQty: initialQty,
            };
          }));
        } else {
          setOtherItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [requestedQtyByRecipe, requestedQtyByInventory]);

  // --------------------------------------------------
  // TAB DEFINITIONS for TabbedMenu
  // --------------------------------------------------
  const tabs = [
    {
      label: 'Recipes',
      items: recipeItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
      idKey: 'recipeId',
      selectionIdProp: 'recipeId',
    },
    {
      label: 'Others',
      items: otherItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
      idKey: 'id',
      selectionIdProp: 'id',
    },
  ];

  // --------------------------------------------------
  // CALLBACKS: selection and simple field handlers
  // --------------------------------------------------
  const handleSelectionChange = (sel) => {
    setSelection(sel);
  };

  const handleFromStoreChange = (e) => {
    const v = e && e.target ? e.target.value : e;
    setFromStore(String(v ?? ''));
  };

  const handleDateChange = (e) => {
    const v = e && e.target ? e.target.value : e;
    setDate(String(v ?? new Date().toISOString().slice(0,10)));
  };

  // --------------------------------------------------
  // HELPERS: build items payload from selection
  // --------------------------------------------------
  const buildItemsPayload = () => {
    return (selection || [])
      .filter(s => Number(s.quantity) > 0)
      .map(s => {
        const qty = Number(s.quantity);
        if (s.tabLabel === 'Others' || s.tabLabel === 'Other') {
          const invId = Number(s.id ?? s.inventoryItemId);
          if (!Number.isFinite(invId)) return null;
          return { inventoryItemId: invId, quantity: qty };
        }
        const rid = Number(s.recipeId);
        if (!Number.isFinite(rid)) return null;
        return { recipeId: rid, quantity: qty };
      })
      .filter(Boolean);
  };

  // --------------------------------------------------
  // SEND: confirm send flow and update transfer metadata + items
  // --------------------------------------------------
  const handleSend = async (e) => {
    e?.preventDefault?.();
    setSendError('');
    setShowConfirmModal(true);
  };

  const confirmSend = async () => {
    setSendError('');

    // Validation: require at least one selected item
    const itemsToSend = buildItemsPayload();
    if (!itemsToSend || itemsToSend.length === 0) {
      setSendError('Please select at least one item to send.');
      return;
    }

    // Close confirmation modal after validation passes
    setShowConfirmModal(false);

    try {
      const meta = {
        requesterStoreId: requester ? Number(requester) : null,
        fromStoreId: fromStore ? Number(fromStore) : null,
        date,
        notes: notes ? String(notes).trim() : null,
        status: 'requested'
      };

      // update transfer metadata (sets status to pending)
      const metaRes = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      });

      if (!metaRes.ok) {
        const txt = await metaRes.text().catch(() => null);
        throw new Error(txt || `Failed to send transfer (${metaRes.status})`);
      }

      // update items (replace existing) - use validated itemsToSend
      const itemsRes = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}/items`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToSend)
      });

      if (!itemsRes.ok) {
        const txt = await itemsRes.text().catch(() => null);
        throw new Error(txt || `Failed to update transfer items (${itemsRes.status})`);
      }

      // Navigate back to list and pass toast payload so the list page displays toast + inline alert
      navigate('/inventory/transfers', {
        state: {
          toast: {
            title: 'Request sent',
            message: 'Request sent successfully. The other store manager has been notified.',
            notified: 'Store manager(s)'
          }
        }
      });
    } catch (err) {
      console.error('Send failed', err);
      setSendError(err?.message || 'Failed to send transfer');
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="Send Transfer Request"
        descriptionLines={["Review and send your transfer request."]}
      />

      <FormBody onSubmit={(e) => e.preventDefault()} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
              <SelectField label="Requester" value={requester} onChange={() => { }} options={storeOptions} disabled />
          </div>

          <div className="col-12 col-md-6">
              {/* Request From - editable */}
              <SelectField
                  label="Request From"
                  value={fromStore}
                  onChange={handleFromStoreChange}
                  options={storeOptions.filter(o => String(o.value) !== String(requester))}
              />
          </div>

          <div className="col-12 col-md-6">
              {/* Date - editable */}
              <InputField
                  label="Date"
                  value={date}
                  onChange={handleDateChange}
                  type="date"
              />
          </div>

          <div className="col-12 text-start">
              <label className="mb-3">Select the items you want to request supplies from the other store for</label>
              {loading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Loading items...
                </div>
              ) : (
                <TabbedMenu tabs={tabs} contentMaxHeight={360} onSelectionChange={handleSelectionChange} />
              )}
          </div>

          <div className="col-12">
              {/* Notes editable so user can adjust before sending */}
              <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} />
          </div>

          {sendError && (
            <div className="col-12">
              <div className="alert alert-danger">{sendError}</div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-between align-items-center">
              <div>
                  <button type="button" className="btn btn-danger" onClick={() => navigate('/inventory/transfers')}>Cancel</button>
              </div>

              <div>
                  <button type="button" className="btn btn-success" onClick={handleSend}>Send Request</button>
              </div>
          </div>
        </div>
      </FormBody>

      <InfoModal
        show={showConfirmModal}
        title="Confirm Send Transfer Request"
        onClose={() => setShowConfirmModal(false)}
      >
        <p>
          Are you sure you want to send this transfer request? This will set status to <strong>Requested</strong>.
        </p>
        <div className="d-flex justify-content-end">
          <button className="btn btn-secondary me-2" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </button>
          <button className="btn btn-success" onClick={confirmSend}>
            Yes, Send Request
          </button>
        </div>
      </InfoModal>
    </div>
  );
}
