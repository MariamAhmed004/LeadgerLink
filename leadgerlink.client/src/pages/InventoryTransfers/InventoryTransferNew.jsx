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
  const isEmployee = (loggedInUser?.roles || []).includes('Store Employee');

  const [requester, setRequester] = useState('');
  const [fromStore, setFromStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [status, setStatus] = useState('Draft');
  const [notes, setNotes] = useState('');

  const [storeOptions, setStoreOptions] = useState([{ label: 'Select store', value: '' }]);
  const [statusOptions, setStatusOptions] = useState([{ label: 'Draft', value: 'Draft' }, { label: 'Pending', value: 'Pending' }]);

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
        // set default requester to current store if available in auth context
        const defaultStore = loggedInUser?.storeName ?? '';
        setRequester(defaultStore);
      } catch (err) {
        console.error('Failed to load stores', err);
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, [loggedInUser]);

  // Sample items for the tabbed product selector (UI-only)
  const sampleRecipes = [
    { name: "Chicken Shawarma", description: "Spiced chicken sliced, served warm", price: "3.000 BHD", quantity: 10, imageUrl: null, onSelect: () => {} },
    { name: "Veggie Wrap", description: "Fresh vegetables and sauce", price: "2.000 BHD", quantity: 8, imageUrl: null, onSelect: () => {} },
    { name: "Falafel Plate", description: "Crispy falafel with salad", price: "2.500 BHD", quantity: 6, imageUrl: null, onSelect: () => {} }
  ];

  const sampleOthers = [
    { name: "Bottle Water 500ml", description: "500ml bottled water", price: "0.200 BHD", quantity: 50, imageUrl: null, onSelect: () => {} },
    { name: "Soda Can 330ml", description: "Carbonated soft drink", price: "0.300 BHD", quantity: 30, imageUrl: null, onSelect: () => {} },
    { name: "Napkins Pack", description: "Pack of 50 napkins", price: "0.500 BHD", quantity: 20, imageUrl: null, onSelect: () => {} }
  ];

  const tabs = [
    { label: "Recipes", items: sampleRecipes, cardComponent: (it) => <MenuTabCard data={it} /> },
    { label: "Others", items: sampleOthers, cardComponent: (it) => <MenuTabCard data={it} /> }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // UI-only: Save action -> navigate back for now
    navigate('/inventory/transfers');
  };

  const handleSendClick = (e) => {
    e.preventDefault();
    // show info modal before sending
    setShowSendModal(true);
  };

  const confirmSend = () => {
    // UI-only: pretend to send and navigate back
    setShowSendModal(false);
    navigate('/inventory/transfers');
  };

  const cancelSend = () => {
    setShowSendModal(false);
  };

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="New Transfer Request"
        descriptionLines={["Fill in the form to add a transfer request from your organization stores.", "You can set the request on Draft status and have an Employee to fill in the content, or fill it in and send the request to the other store."]}
      />

      <FormBody onSubmit={handleSubmit} plain>
        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6">
            <SelectField label="Requester" value={requester} onChange={setRequester} options={storeOptions} disabled={isEmployee} />
          </div>
          <div className="col-12 col-md-6">
            <SelectField label="Request From" value={fromStore} onChange={setFromStore} options={storeOptions} />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={setDate} type="date" />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Status" value={status} onChange={setStatus} options={statusOptions} />
          </div>

          {/* Tabbed product selection - UI only */}
          <div className="col-12">
            <TabbedMenu tabs={tabs} contentMaxHeight={360} />
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} />
          </div>

          <div className="col-12 d-flex justify-content-between align-items-center">
            {/* Left: Send Request (prominent green) */}
            <div>
              <button type="button" className="btn btn-success px-4" onClick={handleSendClick}>
                Send Request
              </button>
            </div>

            {/* Right: Save (primary) + Cancel (FormActions provides Save + Cancel) */}
            <div>
              <FormActions onCancel={() => navigate('/inventory/transfers')} submitLabel="Save" />
            </div>
          </div>
        </div>
      </FormBody>

      <InfoModal show={showSendModal} title="Send Transfer Request" onClose={cancelSend}>
        <p>Sending this transfer request will officially notify the requested store manager. Are you sure you want to proceed?</p>
        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={cancelSend}>Cancel</button>
          <button className="btn btn-success" onClick={confirmSend}>Send Request</button>
        </div>
      </InfoModal>
    </div>
  );
}
