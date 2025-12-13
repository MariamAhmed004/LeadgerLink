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

export default function InventoryTransferApprove() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();
  const userStoreId = loggedInUser?.storeId ?? loggedInUser?.StoreId ?? null;

  // form state
  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [driver, setDriver] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [storeOptions, setStoreOptions] = useState([{ label: 'Loading stores...', value: '' }]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storesError, setStoresError] = useState('');

  const [drivers, setDrivers] = useState([]); // full driver objects { driverId, driverName, driverEmail, storeId }
  const [driverOptions, setDriverOptions] = useState([{ label: 'Select Driver', value: '' }]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // transfer detail state
  const [transferDetail, setTransferDetail] = useState(null);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  // requested items state (populated from transfer items where isRequested is true)
  const [requestedRecipes, setRequestedRecipes] = useState([]);
  const [requestedOthers, setRequestedOthers] = useState([]);

  // send (current store) data
  const [sendRecipes, setSendRecipes] = useState([]);
  const [sendOthers, setSendOthers] = useState([]);
  const [loadingSendData, setLoadingSendData] = useState(false);

  // selection state for send tabbed menu (used for validation)
  const [sendSelection, setSendSelection] = useState([]);
  const [selectionError, setSelectionError] = useState('');

  // Tab definitions
  const requestedTabs = [
    { label: 'Recipes', items: requestedRecipes, cardComponent: (it) => <RequestedMenuTabCard data={it} /> },
    { label: 'Others', items: requestedOthers, cardComponent: (it) => <RequestedMenuTabCard data={it} /> },
  ];

  const sendTabs = [
    { label: 'Recipes', items: sendRecipes, cardComponent: (it) => <MenuTabCard data={it} /> },
    { label: 'Others', items: sendOthers, cardComponent: (it) => <MenuTabCard data={it} /> },
  ];

  // Load stores for current organization and populate requester / request-from select options
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

  // Map transfer's store names to store option ids once both are available
  useEffect(() => {
    if (!transferDetail || !storeOptions || storeOptions.length === 0) return;

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

    // notes and driver email
    setNotes(transferDetail.notes ?? '');
    setDriverEmail(transferDetail.driverEmail ?? '');
  }, [transferDetail, storeOptions]);

  // Load inventory transfer details and populate requested tabs
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

        // prepare requested items (filter isRequested === true)
        const items = Array.isArray(json.items) ? json.items : [];
        const requested = items.filter(it => it.isRequested === true || it.isRequested === 1);

        // Build arrays by type; fetch details where needed
        const recPromises = requested
          .filter(it => it.recipeId)
          .map(async (it) => {
            const qty = it.quantity ?? 0;
            try {
              // fetch recipe detail by id (use dedicated endpoint)
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

  // Load drivers when the "fromStore" (request-from) changes.
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

  // Load send-side data (recipes + inventory items) for current logged-in user's store
  useEffect(() => {
    let mounted = true;
    const loadSendData = async () => {
      if (!userStoreId) return;
      setLoadingSendData(true);
      try {
        // Use recipes controller endpoint that returns recipes for current authenticated user's store
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

        // Map recipes -> Tab card shape using server DTO fields from GetForCurrentStore()
        const mappedRecipes = (Array.isArray(recipes) ? recipes : []).map((r) => {
          // server returns: recipeName, description, imageUrl, sellingPrice, available, relatedProductId
          const name = r.recipeName ?? r.recipeName ?? '';
          const description = r.description ?? r.instructions ?? r.Description ?? '';
          const image = r.imageUrl ?? r.imageDataUrl ?? r.image ?? null;
          const qty = Number(r.available ?? r.availableCount ?? r.Available ?? 0);
          const price = r.sellingPrice != null ? `BHD ${Number(r.sellingPrice).toFixed(3)}` : 'NA';
          return { name, description, imageUrl: image, quantity: qty, price };
        });

        // Inventory items for current store (list-for-current-store supports storeId query)
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

        // Map inventory items -> Tab card shape. Use ImageUrl and attempt to read selling price if available via relatedProductId
        const mappedItems = await Promise.all((Array.isArray(items) ? items : []).map(async (it) => {
          const idVal = it.inventoryItemId ?? it.inventoryItem_id ?? it.id ?? null;
          const name = it.inventoryItemName ?? it.inventoryItem_name ?? it.name ?? '';
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
          return { name, description, imageUrl: image, quantity: qty, price };
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

  // Update displayed driver email when driver selection changes
  useEffect(() => {
    if (!driver) {
      setDriverEmail('');
      return;
    }
    const sel = drivers.find(d => String(d.driverId) === String(driver));
    setDriverEmail(sel?.driverEmail || '');
  }, [driver, drivers]);

  // TabbedMenu onSelectionChange for send tabs
  const onSendSelectionChange = (sel) => {
    setSendSelection(Array.isArray(sel) ? sel : []);
    if ((sel || []).length > 0) setSelectionError('');
  };

  const handleApprove = (e) => {
    e?.preventDefault?.();
    // Validate at least one item selected to send
    if (!sendSelection || sendSelection.length === 0) {
      setSelectionError('Select at least one item to send before approving.');
      return;
    }
    setSelectionError('');
    setShowApproveModal(true);
  };

  const confirmApprove = () => {
    setShowApproveModal(false);
    navigate('/inventory/transfers');
  };

  const handleReject = (e) => {
    e?.preventDefault?.();
    setShowRejectModal(true);
  };
  const confirmReject = () => {
    setShowRejectModal(false);
    navigate('/inventory/transfers');
  };

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
