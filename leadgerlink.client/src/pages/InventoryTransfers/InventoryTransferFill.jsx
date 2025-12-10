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
import FormActions from '../../components/Form/FormActions';

export default function InventoryTransferFill() {
  const { id } = useParams();
  const navigate = useNavigate();

  // fields (disabled as per design)
  const [requester, setRequester] = useState(''); // storeId as string
  const [fromStore, setFromStore] = useState(''); // storeId as string
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  // tabs data
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);

  // requested quantities map from transfer details
  const [requestedQtyByProduct, setRequestedQtyByProduct] = useState({}); // { [productId]: qty }
  const [requestedQtyByInventory, setRequestedQtyByInventory] = useState({}); // { [inventoryItemId]: qty }

  // Build Request From options excluding the requester store
  const requestFromOptions = (storeOptions || []).filter(o => String(o.value) !== String(requester));

  // Load stores same as InventoryTransferNew
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
      } catch (err) {
        console.error('Failed to load stores', err);
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, []);

  // Fetch recipes and inventory items for tabs same as InventoryTransferNew
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
          const mappedRecipes = recipesArr.map(r => {
            const productId = r.relatedProductId ?? r.productId ?? null;
            const initialQty = productId != null ? Number(requestedQtyByProduct[String(productId)] || 0) : 0;
            return {
              productId,
              name: r.recipeName ?? r.productName ?? 'Recipe',
              description: r.description ?? 'NA',
              price: r.sellingPrice != null ? (Number(r.sellingPrice).toFixed(3) + ' BHD') : 'NA',
              quantity: Number(r.availableQuantity ?? 0),
              imageUrl: r.imageUrl || '',
              initialSelectedQty: initialQty,
            };
          });
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
            const initialQty = id != null ? Number(requestedQtyByInventory[String(id)] || 0) : 0;
            return {
              productId: null, // inventory item, not a product
              id,
              name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? 'Item',
              description: desc,
              price: priceVal > 0 ? `${priceVal.toFixed(3)} BHD` : '',
              quantity: available,
              imageUrl: imgUrl,
              initialSelectedQty: initialQty,
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
  }, [requestedQtyByProduct, requestedQtyByInventory]);

  // Load transfer details by id and bind to fields, including requested items quantities
  useEffect(() => {
    let isMounted = true;

    async function loadTransfer() {
      try {
          const res = await fetch(`/api/inventorytransfers/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          // prefer IDs for dropdown binding when available
          const requesterId = data?.requesterStoreId ?? data?.requesterId ?? null;
          const fromStoreId = data?.fromStoreId ?? data?.requestedFromStoreId ?? null;
          setRequester(requesterId != null ? String(requesterId) : '');
          setFromStore(fromStoreId != null ? String(fromStoreId) : '');
          setDate(data?.date ? new Date(data.date).toISOString().slice(0, 10) : '');
          setStatus(data?.status ?? '');
          setNotes(data?.notes ?? '');

          // Map requested items quantities
          const itemsArr = Array.isArray(data?.items) ? data.items : [];
          const prodMap = {};
          const invMap = {};
          itemsArr.forEach(it => {
            const qty = Number(it.quantity ?? 0);
            if (qty <= 0) return;
            const pid = it.productId ?? it.ProductId ?? null;
            const iid = it.inventoryItemId ?? it.InventoryItemId ?? null;
            if (pid != null) prodMap[String(pid)] = qty;
            if (iid != null) invMap[String(iid)] = qty;
          });
          setRequestedQtyByProduct(prodMap);
          setRequestedQtyByInventory(invMap);
        } else {
          if (!isMounted) return;
          setRequester('');
          setFromStore('');
          setDate(new Date().toISOString().slice(0, 10));
          setStatus('Pending');
          setNotes('');
          setRequestedQtyByProduct({});
          setRequestedQtyByInventory({});
        }
      } catch {
        if (!isMounted) return;
        setRequester('');
        setFromStore('');
        setDate(new Date().toISOString().slice(0, 10));
        setStatus('Pending');
        setNotes('');
        setRequestedQtyByProduct({});
        setRequestedQtyByInventory({});
      }
    }

    if (id) loadTransfer();

    return () => { isMounted = false; };
  }, [id]);

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

  const handleSave = (e) => {
    e?.preventDefault?.();
    // UI-only: navigate back
    navigate('/inventory/transfers');
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="Fill Transfer Request"
        descriptionLines={["Following organization are contracted with LedgerLink:", "Click on the organization name to view its details"]}
      />

      <FormBody onSubmit={handleSave} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <SelectField
              label="Requester"
              value={requester}
              onChange={() => {}}
              options={storeOptions}
              disabled={true}
            />
          </div>

          <div className="col-12 col-md-6">
            <SelectField
              label="Request From"
              value={fromStore}
              onChange={() => {}}
              options={requestFromOptions}
              disabled={true}
            />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={() => {}} type="date" readOnly disabled />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Status" value={status} onChange={() => {}} options={[{ label: status || '—', value: status }]} disabled={true} />
          </div>

          <div className="col-12">
            <TabbedMenu tabs={tabs} contentMaxHeight={360} />
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} rows={4} readOnly disabled />
          </div>

          <div className="col-12 d-flex justify-content-between align-items-center">
            <div>
              <button type="button" className="btn btn-danger" onClick={() => navigate('/inventory/transfers')}>Cancel</button>
            </div>

            <div>
              <FormActions onCancel={() => navigate('/inventory/transfers')} submitLabel="Save" />
            </div>
          </div>
        </div>
      </FormBody>
    </div>
  );
}
