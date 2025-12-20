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

export default function InventoryTransferSend() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  const [selection, setSelection] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);
  const [requestedQtyByRecipe, setRequestedQtyByRecipe] = useState({});
  const [requestedQtyByInventory, setRequestedQtyByInventory] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendError, setSendError] = useState('');

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

  // Load transfer details and preselect items like Fill page
  useEffect(() => {
    let isMounted = true;
    async function loadTransfer() {
      try {
        const res = await fetch(`/api/inventorytransfers/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const requesterId = data?.requesterStoreId ?? data?.requesterId ?? null;
        const fromStoreId = data?.fromStoreId ?? data?.requestedFromStoreId ?? null;
        setRequester(requesterId != null ? String(requesterId) : '');
        setFromStore(fromStoreId != null ? String(fromStoreId) : '');
        setDate(data?.date ? new Date(data.date).toISOString().slice(0, 10) : date);
        setNotes(data?.notes ?? '');

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

        // set maps — actual tab item arrays will be built using these maps
        setRequestedQtyByRecipe(reqByRecipe);
        setRequestedQtyByInventory(reqByInv);
      } catch { /* noop */ }
    }
    if (id) loadTransfer();
    return () => { isMounted = false; };
  }, [id]);

  // Fetch recipes and inventory items for tabs
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch('/api/recipes/for-current-store', { credentials: 'include' }).catch(() => null),
          fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', { credentials: 'include' }).catch(() => null),
        ]);

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

  const handleSend = async (e) => {
    e?.preventDefault?.();
    setSendError('');
    setShowConfirmModal(true);
  };

  const confirmSend = async () => {
    setShowConfirmModal(false);
    setSendError('');
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

      // update items (replace existing)
      const items = buildItemsPayload();
      const itemsRes = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}/items`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });

      if (!itemsRes.ok) {
        const txt = await itemsRes.text().catch(() => null);
        throw new Error(txt || `Failed to update transfer items (${itemsRes.status})`);
      }

      navigate('/inventory/transfers');
    } catch (err) {
      console.error('Send failed', err);
      setSendError(err?.message || 'Failed to send transfer');
    }
  };

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
