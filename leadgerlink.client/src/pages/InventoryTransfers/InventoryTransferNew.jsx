import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExchangeAlt } from 'react-icons/fa';
import PageHeader from '../../components/Listing/PageHeader';
import FormBody from '../../components/Form/FormBody';
import SelectField from '../../components/Form/SelectField';
import InputField from '../../components/Form/InputField';
import FormActions from '../../components/Form/FormActions';
import { useAuth } from '../../Context/AuthContext';
import TabbedMenu from '../../components/Form/TabbedMenu';
import MenuTabCard from '../../components/Form/MenuTabCard';
import InfoModal from '../../components/Ui/InfoModal';
import TextArea from '../../components/Form/TextArea';

/*
  InventoryTransferNew.jsx
  Summary:
  - Form page to create a new inventory transfer request between stores.
  - Loads stores, recipes and inventory items for selection and builds a payload
    to save as draft or send the request (status determined by action buttons).
*/

// --------------------------------------------------
// COMPONENT / CONTEXT
// --------------------------------------------------
export default function InventoryTransferNew() {
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();
  // organization admin flag used to control requester behaviour
  const isOrgAdmin = (loggedInUser?.roles || []).includes('Organization Admin');

  // --------------------------------------------------
  // STATE: core form fields
  // --------------------------------------------------
  // requester and from-store (store ids stored as strings for SelectField)
  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  // date defaulted to today, status controlled by actions, notes optional
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [status, setStatus] = useState('Draft'); // internal status determined by actions
  const [notes, setNotes] = useState('');

  // store options for selects
  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  // --------------------------------------------------
  // STATE: selection and tabs data
  // --------------------------------------------------
  // selection captured from TabbedMenu (for future submit)
  const [selection, setSelection] = useState([]); // [{tabLabel,index,productId,name,price,quantity,recipeId}]

  // data shown in tabs
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);

  // modal state for send confirmation/info
  const [showSendModal, setShowSendModal] = useState(false);

  // --------------------------------------------------
  // EFFECT: load stores for requester / request-from selects
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      try {
        const res = await fetch('/api/stores', { credentials: 'include' });
        if (!res.ok) return;
        const arr = await res.json();
        if (!mounted) return;
        // map server stores to select options
        const opts = [{ label: 'Select store', value: '' }, ...(Array.isArray(arr) ? arr.map(s => ({ label: s.storeName, value: String(s.storeId) })) : [])];
        setStoreOptions(opts);

        // pre-fill requester for non-admin users (their store)
        const userStoreId = loggedInUser?.storeId ? String(loggedInUser.storeId) : '';
        if (!isOrgAdmin) {
          setRequester(userStoreId);
          // ensure Request From not equal to requester
          if (String(fromStore) === userStoreId) setFromStore('');
        } else {
          setRequester(userStoreId || '');
          // if admin selected same store in both, clear fromStore to avoid duplicates
          if (userStoreId && String(fromStore) === userStoreId) setFromStore('');
        }
      } catch (err) {
        // ignore store load failures (UI will show default)
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, [loggedInUser, isOrgAdmin]);

  // clear Request From when requester changes to avoid same-store requests
  useEffect(() => {
    if (requester && String(fromStore) === String(requester)) {
      setFromStore('');
    }
  }, [requester]);

  // --------------------------------------------------
  // EFFECT: load recipes and inventory items for TabbedMenu tabs
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch('/api/recipes/for-current-store', { credentials: 'include' }).catch(() => null),
          fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', { credentials: 'include' }).catch(() => null),
        ]);

        // Recipes tab items: carry recipeId for payload building
        if (mounted && recipesRes && recipesRes.ok) {
          const rlist = await recipesRes.json();
          const recipesArr = Array.isArray(rlist) ? rlist : [];
          const mappedRecipes = recipesArr.map(r => ({
            // Ensure the actual recipe id is carried through for payload
            recipeId: r.recipeId ?? r.RecipeId ?? null,
            productId: r.relatedProductId ?? r.productId ?? null,
            name: r.recipeName ?? r.productName ?? 'Recipe',
            description: r.description ?? 'NA',
            price: r.sellingPrice != null ? (Number(r.sellingPrice).toFixed(3) + ' BHD') : 'NA',
            quantity: Number(r.availableQuantity ?? 0),
            imageUrl: r.imageUrl || ''
          }));
          setRecipeItems(mappedRecipes);
        } else {
          setRecipeItems([]);
        }

        // Inventory tab items for 'Others'
        if (mounted && itemsRes && itemsRes.ok) {
          const json = await itemsRes.json();
          const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
          const mappedItems = (list || []).map(it => {
            const id = it.inventoryItemId ?? it.id ?? it.InventoryItemId;
            const imgUrl = it.imageUrl || '';
            const desc = it.description ?? it.inventoryItemDescription ?? it.Description ?? '';
            const available = Number(it.quantity ?? it.Quantity ?? 0);
            const priceVal = Number(it.costPerUnit ?? it.CostPerUnit ?? 0);
            return {
              productId: null, // inventory item, not a product
              id,
              name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? 'Item',
              description: desc,
              price: priceVal > 0 ? `${priceVal.toFixed(3)} BHD` : '',
              quantity: available,
              imageUrl: imgUrl,
            };
          });
          setOtherItems(mappedItems);
        } else {
          setOtherItems([]);
        }
      } catch (err) {
        // on failure clear both lists to keep UI consistent
        setRecipeItems([]);
        setOtherItems([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // --------------------------------------------------
  // HELPERS: build payload from TabbedMenu selection
  // --------------------------------------------------
  const buildItemsPayload = () => {
    return (selection || [])
      .filter(s => Number(s.quantity) > 0)
      .map(s => {
        const qty = Number(s.quantity);

        // Others tab: inventory items use `id` -> InventoryItemId in payload
        if (s.tabLabel === 'Others') {
          const invId = Number(s.id);
          if (!Number.isFinite(invId)) {
            return null;
          }
          return { InventoryItemId: invId, Quantity: qty };
        }

        // Recipes tab: use recipeId
        const rid = Number(s.recipeId);
        if (!Number.isFinite(rid)) {
          return null;
        }
        return { RecipeId: rid, Quantity: qty };
      })
      .filter(Boolean);
  };

  // Defer selection state updates to avoid setState during TabbedMenu render
  const handleSelectionChange = (sel) => {
    Promise.resolve().then(() => setSelection(sel));
  };

  // --------------------------------------------------
  // SUBMIT: save draft (POST with status 'draft')
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('draft'); // Save posts status = "draft"

    const items = buildItemsPayload();

    const payload = {
      requesterStoreId: requester ? Number(requester) : null,
      fromStoreId: fromStore ? Number(fromStore) : null,
      date,
      status: 'draft',
      notes: notes ? String(notes).trim() : null,
      items
    };

    try {
      const res = await fetch('/api/inventorytransfers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to save transfer (${res.status})`);
      }
      navigate('/inventory/transfers');
    } catch (err) {
      console.error('Save failed', err);
      alert(err?.message || 'Failed to save transfer');
    }
  };

  // --------------------------------------------------
  // SEND flow: show confirmation modal then POST with status 'requested'
  // --------------------------------------------------
  const handleSendClick = (e) => {
    e.preventDefault();
    setShowSendModal(true);
  };

  const confirmSend = async () => {
    setShowSendModal(false);
    setStatus('requested'); // Send posts status = "requested"

    const items = buildItemsPayload();
    const payload = {
      requesterStoreId: requester ? Number(requester) : null,
      fromStoreId: fromStore ? Number(fromStore) : null,
      date,
      status: 'requested',
      notes: notes ? String(notes).trim() : null,
      items
    };

    try {
      const res = await fetch('/api/inventorytransfers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Failed to send transfer (${res.status})`);
      }
      navigate('/inventory/transfers');
    } catch (err) {
      console.error('Send failed', err);
      alert(err?.message || 'Failed to send transfer');
    }
  };

  const cancelSend = () => {
    setShowSendModal(false);
  };

  // --------------------------------------------------
  // UTIL: Request From options exclude the requester
  // --------------------------------------------------
  const requestFromOptions = (storeOptions || []).filter(o => String(o.value) !== String(requester));

  // Provide explicit id hints so TabbedMenu emits recipeId for recipes and id for inventory items
  const tabs = [
    {
      label: 'Recipes',
      items: recipeItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
      idKey: 'recipeId',           // instruct TabbedMenu to read this id from items
      selectionIdProp: 'recipeId', // include it in selection objects
    },
    {
      label: 'Others',
      items: otherItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
      idKey: 'id',                 // inventory items use `id`
      selectionIdProp: 'id',       // include it in selection objects
    },
  ];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="New Transfer Request"
        descriptionLines={["Fill in the form to add a transfer request from your organization stores.", "You can save as Draft or send the request to the other store manager."]}
      />

      <FormBody onSubmit={handleSubmit} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <SelectField
              label="Requester"
              value={requester}
              onChange={(val) => {
                setRequester(val);
                // If admin and "Request From" matches new requester, clear it
                if (String(fromStore) === String(val)) setFromStore('');
              }}
              options={storeOptions}
              disabled={!isOrgAdmin}
            />
          </div>
          <div className="col-12 col-md-6">
            <SelectField
              label="Request From"
              value={fromStore}
              onChange={setFromStore}
              options={requestFromOptions}
            />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={setDate} type="date" />
          </div>

          {/* Status select removed; status determined by actions */}

          {/* Tabbed product selection - explicit fetch for two tabs */}
          <div className="col-12 text-start">
            <label className="mb-3">Select the items you want to request supplies from the other store for</label>
            <TabbedMenu
              tabs={tabs}
              contentMaxHeight={360}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} />
          </div>

          <div className="col-12 d-flex  justify-content-between align-items-center">
            {/* Left: Send Request (prominent green) */}
            <div>
              <button type="button" className="btn btn-success px-4" onClick={handleSendClick}>
                Send Request
              </button>
            </div>

            {/* Right: Save (primary) + Cancel */}
            <div>
              <FormActions onCancel={() => navigate('/inventory/transfers')} submitLabel="Save" />
            </div>
          </div>
        </div>
      </FormBody>

      <InfoModal show={showSendModal} title="Send Transfer Request" onClose={cancelSend}>
        <p>
          This request will be immediately sent to the other store. The requested store manager will be notified right away.
          Do you want to proceed?
        </p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={cancelSend}>Cancel</button>
          <button className="btn btn-success" onClick={confirmSend}>Send Request</button>
        </div>
      </InfoModal>
    </div>
  );
}
