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

export default function InventoryTransferSend() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');

  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);

  const [selection, setSelection] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);

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
        setRecipeItems(prev => prev.map(r => ({ ...r, initialSelectedQty: reqByRecipe[String(r.recipeId)] || 0 })));
        setOtherItems(prev => prev.map(o => ({ ...o, initialSelectedQty: reqByInv[String(o.id)] || 0 })));
      } catch { /* noop */ }
    }
    if (id) loadTransfer();
    return () => { isMounted = false; };
  }, [id]);

  // Fetch recipes and inventory items for tabs
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch('/api/recipes/for-current-store', { credentials: 'include' }).catch(() => null),
          fetch('/api/inventoryitems/list-for-current-store?page=1&pageSize=1000', { credentials: 'include' }).catch(() => null),
        ]);

        if (mounted && recipesRes && recipesRes.ok) {
          const rlist = await recipesRes.json();
          const recipesArr = Array.isArray(rlist) ? rlist : [];
          setRecipeItems(recipesArr.map(r => ({
            recipeId: r.recipeId ?? r.RecipeId ?? null,
            name: r.recipeName ?? r.productName ?? 'Recipe',
            description: r.description ?? 'NA',
            price: r.sellingPrice != null ? (Number(r.sellingPrice).toFixed(3) + ' BHD') : 'NA',
            quantity: Number(r.availableQuantity ?? 0),
            imageUrl: r.imageUrl || '',
            initialSelectedQty: 0,
          })));
        } else {
          setRecipeItems([]);
        }

        if (mounted && itemsRes && itemsRes.ok) {
          const json = await itemsRes.json();
          const list = Array.isArray(json.items) ? json.items : (Array.isArray(json) ? json : []);
          setOtherItems((list || []).map(it => ({
            id: it.inventoryItemId ?? it.id ?? it.InventoryItemId,
            name: it.inventoryItemName ?? it.name ?? it.InventoryItemName ?? 'Item',
            description: it.description ?? it.inventoryItemDescription ?? it.Description ?? '',
            price: Number(it.costPerUnit ?? it.CostPerUnit ?? 0) > 0 ? `${Number(it.costPerUnit ?? it.CostPerUnit ?? 0).toFixed(3)} BHD` : '',
            quantity: Number(it.quantity ?? it.Quantity ?? 0),
            imageUrl: it.imageUrl || '',
            initialSelectedQty: 0,
          })));
        } else {
          setOtherItems([]);
        }
      } catch { /* noop */ }
    };
    load();
    return () => { mounted = false; };
  }, []);

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
            <SelectField label="Requester" value={requester} onChange={() => {}} options={storeOptions} disabled />
          </div>
          <div className="col-12 col-md-6">
            <SelectField label="Request From" value={fromStore} onChange={() => {}} options={storeOptions.filter(o => String(o.value) !== String(requester))} disabled />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={() => {}} type="date" readOnly disabled />
          </div>

          <div className="col-12 text-start">
            <label className="mb-3">Select the items you want to request supplies from the other store for</label>
            <TabbedMenu tabs={tabs} contentMaxHeight={360} onSelectionChange={handleSelectionChange} />
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} readOnly disabled />
          </div>

          <div className="col-12 d-flex justify-content-between align-items-center">
            <div>
              <button type="button" className="btn btn-danger" onClick={() => navigate('/inventory/transfers')}>Cancel</button>
            </div>

            <div>
              <button type="button" className="btn btn-success">Send Request</button>
            </div>
          </div>
        </div>
      </FormBody>
    </div>
  );
}
