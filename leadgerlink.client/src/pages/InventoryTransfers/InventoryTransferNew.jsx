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

export default function InventoryTransferNew() {
  const navigate = useNavigate();
  const { loggedInUser } = useAuth();
  const isOrgAdmin = (loggedInUser?.roles || []).includes('Organization Admin');

  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [status, setStatus] = useState('Draft'); // internal status determined by actions
  const [notes, setNotes] = useState('');

  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  // selection captured from TabbedMenu (for future submit)
  const [selection, setSelection] = useState([]); // [{tabLabel,index,productId,name,price,quantity}]

  // tabs data
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);

  // modal state for send confirmation/info
  const [showSendModal, setShowSendModal] = useState(false);

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
        console.error('Failed to load stores', err);
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, [loggedInUser, isOrgAdmin]);

  // When requester changes, if Request From equals requester, clear Request From
  useEffect(() => {
    if (requester && String(fromStore) === String(requester)) {
      setFromStore('');
    }
  }, [requester]);

  // Fetch recipes and inventory items for tabs
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch('/api/recipes/for-current-store', { credentials: 'include' }).catch(() => null),
          fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', { credentials: 'include' }).catch(() => null),
        ]);

        // Recipes tab items
        if (mounted && recipesRes && recipesRes.ok) {
          const rlist = await recipesRes.json();
          const recipesArr = Array.isArray(rlist) ? rlist : [];
          const mappedRecipes = recipesArr.map(r => ({
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

        // Others tab items from inventory
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
        console.error('Failed to load tabs data', err);
        setRecipeItems([]);
        setOtherItems([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Save -> set Draft then navigate back (now posts to backend)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('draft');

    const items = (selection || [])
      .filter(s => Number(s.quantity) > 0)
      .map(s => ({ productId: Number(s.productId), quantity: Number(s.quantity) }));

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
      console.error(err);
      // optionally show error UI; for now, simple alert
      alert(err.message || 'Failed to save transfer');
    }
  };

  // Send request flow -> show modal, confirm sets Pending then navigate
  const handleSendClick = (e) => {
    e.preventDefault();
    setShowSendModal(true);
  };

  const confirmSend = () => {
    setShowSendModal(false);
    setStatus('pending');
    // Prepare payload for future API (do not submit now)
    const items = (selection || []).filter(s => Number(s.quantity) > 0).map(s => ({ productId: Number(s.productId), quantity: Number(s.quantity) }));
    const payload = {
      requesterStoreId: requester ? Number(requester) : null,
      fromStoreId: fromStore ? Number(fromStore) : null,
      date,
      status: 'pending',
      notes: notes ? String(notes).trim() : null,
      items
    };
    // Future: POST /api/inventory-transfers/send with payload
    navigate('/inventory/transfers');
  };

  const cancelSend = () => {
    setShowSendModal(false);
  };

  // Build Request From options excluding the requester store
  const requestFromOptions = (storeOptions || []).filter(o => String(o.value) !== String(requester));

  const tabs = [
    {
      label: 'Recipes',
      items: recipeItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
    },
    {
      label: 'Others',
      items: otherItems,
      cardComponent: (it) => <MenuTabCard data={{ ...it, enforceAvailability: false }} />,
    },
  ];

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
              onSelectionChange={(sel) => setSelection(sel)}
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
          Sending this transfer request will officially notify the requested store manager. Please wait until they reply.
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
