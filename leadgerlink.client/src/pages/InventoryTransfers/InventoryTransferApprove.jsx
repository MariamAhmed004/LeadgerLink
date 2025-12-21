import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaExchangeAlt } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FormBody from '../../components/Form/FormBody';
import SelectField from '../../components/Form/SelectField';
import InputField from '../../components/Form/InputField';
import TabbedMenu from '../../components/Form/TabbedMenu';
import MenuTabCard from '../../components/Form/MenuTabCard';
import RequestedMenuTabCard from '../../components/Form/RequestedMenuTabCard';
import TextArea from '../../components/Form/TextArea';
import InfoModal from '../../components/Ui/InfoModal';
import TitledGroup from '../../components/Form/TitledGroup';
import { useAuth } from '../../Context/AuthContext';

/*
  InventoryTransferApprove.jsx
  Summary:
  - Page for reviewing and approving/rejecting inventory transfer requests.
  - Loads transfer details, requested items and local send-side options (recipes/items).
  - Lets the approver select items to send, choose a driver and confirm approval or rejection.
*/

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function InventoryTransferApprove() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();
  // store id of the current logged-in user's store (used to load send-side data)
  const userStoreId = loggedInUser?.storeId ?? loggedInUser?.StoreId ?? null;

  // --------------------------------------------------
  // STATE: form fields
  // --------------------------------------------------
  // basic form fields (requester / from store / date)
  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  // driver details and optional new driver data
  const [driver, setDriver] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [notes, setNotes] = useState('');

  // --------------------------------------------------
  // STATE: lookups and loading flags
  // --------------------------------------------------
  // store lookup options used for requester and request-from display
  const [storeOptions, setStoreOptions] = useState([{ label: 'Loading stores...', value: '' }]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storesError, setStoresError] = useState('');

  // drivers for the selected fromStore
  const [drivers, setDrivers] = useState([]); // full driver objects { driverId, driverName, driverEmail, storeId }
  const [driverOptions, setDriverOptions] = useState([{ label: 'Select Driver', value: '' }]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // modals for confirm approve/reject
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // --------------------------------------------------
  // STATE: transfer details and requested items
  // --------------------------------------------------
  // transfer DTO and loading flag
  const [transferDetail, setTransferDetail] = useState(null);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  // requested items split into recipes and others for display
  const [requestedRecipes, setRequestedRecipes] = useState([]);
  const [requestedOthers, setRequestedOthers] = useState([]);

  // --------------------------------------------------
  // STATE: send-side (current store) data to choose from
  // --------------------------------------------------
  const [sendRecipes, setSendRecipes] = useState([]);
  const [sendOthers, setSendOthers] = useState([]);
  const [loadingSendData, setLoadingSendData] = useState(false);

  // selection state for send TabbedMenu (used for validation before approve)
  const [sendSelection, setSendSelection] = useState([]);
  const [selectionError, setSelectionError] = useState('');

  // --------------------------------------------------
  // TAB DEFINITIONS
  // --------------------------------------------------
  // requested tabs show items requested by the other store
  const requestedTabs = [
    { label: 'Recipes', items: requestedRecipes, cardComponent: (it) => <RequestedMenuTabCard data={it} /> },
    { label: 'Others', items: requestedOthers, cardComponent: (it) => <RequestedMenuTabCard data={it} /> },
  ];

  // send tabs include idKey/selectionIdProp used by TabbedMenu/selection mapping
  const sendTabs = [
    { label: 'Recipes', items: sendRecipes, cardComponent: (it) => <MenuTabCard data={it} />, idKey: 'recipeId', selectionIdProp: 'recipeId' },
    { label: 'Others',  items: sendOthers,  cardComponent: (it) => <MenuTabCard data={it} />, idKey: 'inventoryItemId', selectionIdProp: 'inventoryItemId' },
  ];

  // --------------------------------------------------
  // EFFECT: load stores for select options
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingStores(true);
      setStoresError('');
      try {
        const res = await fetch('/api/stores', { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => 'Failed to load stores');
          throw new Error(txt || 'Failed to load stores');
        }
        const data = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : (data.items || []);
        const opts = [{ label: 'Select store', value: '' }, ...arr.map((s) => ({ label: s.storeName ?? 'Unnamed', value: String(s.storeId) }))];
        setStoreOptions(opts);
      } catch (err) {
        console.error('Failed to load stores', err);
        if (mounted) {
          setStoresError(err?.message || 'Failed to load stores');
          setStoreOptions([{ label: 'Failed to load stores', value: '' }]);
        }
      } finally {
        if (mounted) setLoadingStores(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // EFFECT: bind transfer store names to option ids and populate basic form fields
  // --------------------------------------------------
  useEffect(() => {
    if (!transferDetail || !storeOptions || storeOptions.length === 0) return;

    // map store names in transfer DTO to the option values
    const toName = transferDetail.toStoreName || '';
    const fromName = transferDetail.fromStoreName || '';

    const toOpt = storeOptions.find((o) => String(o.label) === String(toName));
    const fromOpt = storeOptions.find((o) => String(o.label) === String(fromName));

    if (toOpt) setRequester(toOpt.value);
    if (fromOpt) setFromStore(fromOpt.value);

    // bind date (prefer requestedAt, fallback to transferDate)
    const requestedAt = transferDetail.requestedAt ?? transferDetail.transferDate;
    if (requestedAt) {
      const d = new Date(requestedAt);
      if (!isNaN(d.getTime())) setDate(d.toISOString().slice(0, 10));
    }

    // also populate notes and driver email if present
    setNotes(transferDetail.notes ?? '');
    setDriverEmail(transferDetail.driverEmail ?? '');
  }, [transferDetail, storeOptions]);

  // --------------------------------------------------
  // EFFECT: load transfer details and prepare requested items
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadTransfer = async () => {
      if (!id) return;
      setLoadingTransfer(true);
      try {
        const res = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}`, { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => `Failed to load transfer ${id}`);
          throw new Error(txt || `Failed to load transfer ${id}`);
        }
        const json = await res.json();
        if (!mounted) return;
        setTransferDetail(json);

        // collect items where isRequested === true
        const items = Array.isArray(json.items) ? json.items : [];
        const requested = items.filter(it => it.isRequested === true || it.isRequested === 1);

        // build promises to fetch recipe/inventory item details when needed
        const recPromises = requested
          .filter(it => it.recipeId)
          .map(async (it) => {
            const qty = it.quantity ?? 0;
            try {
              const rres = await fetch(`/api/recipes/${encodeURIComponent(it.recipeId)}/with-ingredients`, { credentials: 'include' });
              if (rres.ok) {
                const rjson = await rres.json();
                const name = rjson.recipeName ?? it.recipeName ?? '';
                const description = rjson.description ?? rjson.instructions ?? '';
                const image = rjson.image || rjson.imageDataUrl || null;
                return { name, description, imageUrl: image, quantity: qty };
              }
            } catch (ex) {
              console.error('Failed loading recipe', it.recipeId, ex);
            }
            return { name: it.recipeName ?? `Recipe ${it.recipeId}`, description: '', imageUrl: null, quantity: qty };
          });

        const invPromises = requested
          .filter(it => !it.recipeId && it.inventoryItemId)
          .map(async (it) => {
            const qty = it.quantity ?? 0;
            try {
              const ires = await fetch(`/api/inventoryitems/${encodeURIComponent(it.inventoryItemId)}`, { credentials: 'include' });
              if (ires.ok) {
                const ijson = await ires.json();
                const name = ijson.inventoryItemName ?? it.inventoryItemName ?? '';
                const description = ijson.description ?? '';
                const image = ijson.imageDataUrl ?? ijson.imageUrl ?? null;
                return { name, description, imageUrl: image, quantity: qty };
              }
            } catch (ex) {
              console.error('Failed loading inventory item', it.inventoryItemId, ex);
            }
            return { name: it.inventoryItemName ?? `Item ${it.inventoryItemId}`, description: '', imageUrl: null, quantity: qty };
          });

        const recs = await Promise.all(recPromises);
        const others = await Promise.all(invPromises);

        if (mounted) {
          // set requested tabs data
          setRequestedRecipes(recs);
          setRequestedOthers(others);
        }
      } catch (err) {
        console.error('Failed to load transfer detail', err);
      } finally {
        if (mounted) setLoadingTransfer(false);
      }
    };

    loadTransfer();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------------------------------
  // EFFECT: load drivers when fromStore changes
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadDrivers = async () => {
      setLoadingDrivers(true);
      setDrivers([]);
      setDriverOptions([{ label: 'Select Driver', value: '' }]);
      setDriver('');
      setDriverEmail('');
      try {
        if (!fromStore) return;
        const res = await fetch(`/api/inventorytransfers/drivers/by-store/${encodeURIComponent(fromStore)}`, { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => 'Failed to load drivers');
          throw new Error(txt || 'Failed to load drivers');
        }
        const json = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(json) ? json : (json.items || []);
        setDrivers(arr);
        const opts = [{ label: 'Select Driver', value: '' }, ...arr.map(d => ({ label: d.driverName, value: String(d.driverId) }))];
        setDriverOptions(opts);
      } catch (err) {
        console.error('Failed to load drivers', err);
        if (mounted) {
          setDriverOptions([{ label: 'Failed to load drivers', value: '' }]);
        }
      } finally {
        if (mounted) setLoadingDrivers(false);
      }
    };

    loadDrivers();
    return () => { mounted = false; };
  }, [fromStore]);

  // --------------------------------------------------
  // EFFECT: load send-side data (recipes + inventory items) for current user's store
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadSendData = async () => {
      if (!userStoreId) return;
      setLoadingSendData(true);
      try {
        // fetch recipes for current store (non-fatal)
        let recipes = [];
        try {
          const rres = await fetch('/api/recipes/for-current-store', { credentials: 'include' });
          if (rres.ok) {
            const json = await rres.json();
            recipes = Array.isArray(json) ? json : (json.items || []);
          }
        } catch (ex) {
          console.warn('Recipes fetch failed', ex);
        }

        // map recipes into Tab card shape
        const mappedRecipes = (Array.isArray(recipes) ? recipes : []).map((r) => {
          const name = r.recipeName ?? '';
          const description = r.description ?? r.instructions ?? '';
          const image = r.imageUrl ?? r.imageDataUrl ?? r.image ?? null;
          const qty = Number(r.available ?? r.availableCount ?? r.Available ?? 0);
          const price = r.sellingPrice != null ? `BHD ${Number(r.sellingPrice).toFixed(3)}` : 'NA';
          return { name, description, imageUrl: image, quantity: qty, price, recipeId: r.recipeId ?? null };
        });

        // fetch inventory items for current store
        let items = [];
        try {
          const ires = await fetch(`/api/inventoryitems/list-for-current-store?page=1&pageSize=1000&storeId=${encodeURIComponent(userStoreId)}`, { credentials: 'include' });
          if (ires.ok) {
            const ij = await ires.json();
            items = Array.isArray(ij.items) ? ij.items : (Array.isArray(ij) ? ij : []);
          }
        } catch (ex) {
          console.warn('Inventory items fetch failed', ex);
        }

        // map inventory items to Tab card shape, try to fetch related product prices when available
        const mappedItems = await Promise.all((Array.isArray(items) ? items : []).map(async (it) => {
          const idVal = it.inventoryItemId ?? it.inventory_item_id ?? it.id ?? null;
          const name = it.inventoryItemName ?? it.inventory_item_name ?? it.name ?? '';
          const description = it.description ?? '';
          const image = it.imageUrl ?? it.imageDataUrl ?? null;
          const qty = Number(it.quantity ?? it.Quantity ?? 0);
          let price = 'NA';
          const relatedProd = it.relatedProductId ?? it.related_product_id ?? null;
          if (relatedProd) {
            try {
              const pres = await fetch(`/api/products/${encodeURIComponent(relatedProd)}`, { credentials: 'include' });
              if (pres.ok) {
                const pjson = await pres.json();
                if (pjson && pjson.sellingPrice != null) price = `BHD ${Number(pjson.sellingPrice).toFixed(3)}`;
              }
            } catch { /* ignore */ }
          }
          return { name, description, imageUrl: image, quantity: qty, price, inventoryItemId: idVal };
        }));

        if (mounted) {
          setSendRecipes(mappedRecipes);
          setSendOthers(mappedItems);
        }
      } catch (err) {
        console.error('Failed to load send-side data', err);
      } finally {
        if (mounted) setLoadingSendData(false);
      }
    };

    loadSendData();
    return () => { mounted = false; };
  }, [userStoreId]);

  // --------------------------------------------------
  // EFFECT: update driver email display when selection changes
  // --------------------------------------------------
  useEffect(() => {
    if (!driver) {
      setDriverEmail('');
      return;
    }
    const sel = drivers.find(d => String(d.driverId) === String(driver));
    setDriverEmail(sel?.driverEmail || '');
  }, [driver, drivers]);

  // --------------------------------------------------
  // CALLBACKS: selection handlers and validation
  // --------------------------------------------------
  // TabbedMenu selection for send tabs
  const onSendSelectionChange = (sel) => {
    setSendSelection(Array.isArray(sel) ? sel : []);
    if ((sel || []).length > 0) setSelectionError('');
  };

  // Approve click: validate at least one item selected then open modal
  const handleApprove = (e) => {
    e?.preventDefault?.();
    if (!sendSelection || sendSelection.length === 0) {
      setSelectionError('Select at least one item to send before approving.');
      return;
    }
    setSelectionError('');
    setShowApproveModal(true);
  };

  // Confirm approval: build server payload and POST to approve endpoint
  const confirmApprove = async () => {
    setShowApproveModal(false);

    // build items payload expected by server: { RecipeId?, InventoryItemId?, Quantity }
    const itemsPayload = (sendSelection || []).map(s => {
      const tab = String(s.tabLabel || '').toLowerCase();
      const qty = Number(s.quantity || 0);
      const item = { RecipeId: null, InventoryItemId: null, Quantity: qty };
      if (tab === 'recipes') {
        item.RecipeId = s.recipeId ?? s.productId ?? null;
      } else {
        item.InventoryItemId = s.inventoryItemId ?? s.productId ?? null;
      }
      return item;
    }).filter(i => i.Quantity > 0 && (i.RecipeId || i.InventoryItemId));

    const body = {
      DriverId: driver ? Number(driver) : null,
      NewDriverName: newDriverName || null,
      NewDriverEmail: newDriverEmail || null,
      Items: itemsPayload,
      Notes: notes ?? null
    };

    try {
      const res = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }
      navigate('/inventory/transfers');
    } catch (err) {
      console.error('Approve failed', err);
      alert(err?.message || 'Failed to approve transfer');
    }
  };

  // Reject handlers: open modal then call reject endpoint with notes
  const handleReject = (e) => {
    e?.preventDefault?.();
    setShowRejectModal(true);
  };
  const confirmReject = async () => {
    setShowRejectModal(false);
    try {
      const res = await fetch(`/api/inventorytransfers/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Notes: notes ?? null })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }
      navigate('/inventory/transfers');
    } catch (err) {
      console.error('Reject failed', err);
      alert(err?.message || 'Failed to reject transfer');
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="Review Transfer Request"
        descriptionLines={["The following request has been received from one of your organization stores.", "View the requested items and select equivalent items of your inventory to send to the other store"]}
      />

      <FormBody onSubmit={(e) => e.preventDefault()} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <SelectField
              label="Requester"
              value={requester}
              onChange={() => {}}
              options={storeOptions}
              disabled={true}
              searchable={true}
            />
          </div>

          <div className="col-12 col-md-6">
            <SelectField
              label="Request From"
              value={fromStore}
              onChange={() => {}}
              options={storeOptions}
              disabled={true}
              searchable={true}
            />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={() => {}} type="date" disabled />
          </div>

          <div className="col-12">
            <h5>Requested Items From &lt;Store&gt;:</h5>
            <TabbedMenu tabs={requestedTabs} contentMaxHeight={260} />
          </div>

          {/* horizontal rule above driver row */}
          <div className="col-12">
            <hr />
          </div>

          {/* driver select on its own row, beside the selected driver email */}
          <div className="col-12 col-md-6">
            <SelectField
              label="Driver"
              value={driver}
              onChange={setDriver}
              options={driverOptions}
              searchable={true}
              disabled={loadingDrivers || driverOptions.length === 0}
            />
          </div>

          <div className="col-12 col-md-6 d-flex align-items-center">
            <div className="ms-3 text-muted">{driverEmail ? driverEmail : 'Display selected driver email'}</div>
          </div>

          <div className="col-12">
            <TitledGroup title="Add a new Driver, if needed">
              <div className="row gx-3 gy-3">
                <div className="col-12 col-md-6">
                  <InputField label="Driver Name" value={newDriverName} onChange={setNewDriverName} />
                </div>
                <div className="col-12 col-md-6">
                  <InputField label="Driver Email" value={newDriverEmail} onChange={setNewDriverEmail} />
                </div>
              </div>
            </TitledGroup>
          </div>

          <div className="col-12">
            <h5>Sent Items To &lt;Store&gt;:</h5>
            <TabbedMenu tabs={sendTabs} contentMaxHeight={260} onSelectionChange={onSendSelectionChange} />
            {selectionError && <div className="mt-2 alert alert-danger">{selectionError}</div>}
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={3} />
          </div>

          <div className="col-12 d-flex justify-content-between align-items-center">
            <div>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/inventory/transfers')}>Cancel</button>
            </div>

            <div className="d-flex gap-3">
              <button type="button" className="btn btn-danger" onClick={handleReject}>Reject</button>
              <button type="button" className="btn btn-primary" onClick={handleApprove}>Approve</button>
            </div>
          </div>
        </div>
      </FormBody>

      <InfoModal show={showApproveModal} title="Approve Transfer" onClose={() => setShowApproveModal(false)}>
        <p>Approving this transfer will move the selected items from your inventory and notify the requesting store. Proceed?</p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={() => setShowApproveModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmApprove}>Approve</button>
        </div>
      </InfoModal>

      <InfoModal show={showRejectModal} title="Reject Transfer" onClose={() => setShowRejectModal(false)}>
        <p>Rejecting this transfer will notify the requesting store and keep the request closed. Proceed?</p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={() => setShowRejectModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmReject}>Reject</button>
        </div>
      </InfoModal>
    </div>
  );
}
