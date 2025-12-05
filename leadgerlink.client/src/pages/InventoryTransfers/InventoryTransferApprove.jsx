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
import TitledGroup from '../../components/Form/TitledGroup';

export default function InventoryTransferApprove() {
  const { id } = useParams();
  const navigate = useNavigate();

  // static UI-only data
  const [requester] = useState('Store Requesting');
  const [fromStore] = useState('Current Store');
  const [date] = useState(new Date().toISOString().slice(0,10));
  const [status, setStatus] = useState('Pending');
  const [driver, setDriver] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // sample requested items
  const requestedRecipes = [
    { name: 'Recipe A', description: 'Requested recipe A', price: '1.200 BHD', quantity: 5, imageUrl: null },
    { name: 'Recipe B', description: 'Requested recipe B', price: '2.500 BHD', quantity: 2, imageUrl: null },
  ];
  const requestedOthers = [
    { name: 'Item X', description: 'Requested item X', price: '0.300 BHD', quantity: 10, imageUrl: null },
  ];

  // sample sent items (selection from inventory)
  const sendRecipes = [
    { name: 'Recipe A (equivalent)', description: 'From inventory', price: '1.200 BHD', quantity: 5, imageUrl: null },
    { name: 'Recipe C (alternative)', description: 'From inventory', price: '2.000 BHD', quantity: 3, imageUrl: null },
  ];
  const sendOthers = [
    { name: 'Item X (stock)', description: 'From inventory', price: '0.300 BHD', quantity: 10, imageUrl: null },
  ];

  const requestedTabs = [
    { label: 'Recipes', items: requestedRecipes, cardComponent: (it) => <MenuTabCard data={it} /> },
    { label: 'Others', items: requestedOthers, cardComponent: (it) => <MenuTabCard data={it} /> },
  ];

  const sendTabs = [
    { label: 'Recipes', items: sendRecipes, cardComponent: (it) => <MenuTabCard data={it} /> },
    { label: 'Others', items: sendOthers, cardComponent: (it) => <MenuTabCard data={it} /> },
  ];

  const handleApprove = (e) => {
    e?.preventDefault?.();
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
            <SelectField label="Requester" value={requester} onChange={() => {}} options={[{ label: requester, value: requester }]} />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Request From" value={fromStore} onChange={() => {}} options={[{ label: fromStore, value: fromStore }]} />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={() => {}} type="date" />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Status" value={status} onChange={setStatus} options={[{ label: 'Pending', value: 'Pending' }, { label: 'Approved', value: 'Approved' }, { label: 'Rejected', value: 'Rejected' }]} />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Driver" value={driver} onChange={setDriver} options={[{ label: 'Select Driver', value: '' }]} />
          </div>

          <div className="col-12 col-md-6 d-flex align-items-center">
            <div className="ms-3 text-muted">Display selected driver email</div>
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
            <h5>Requested Items From &lt;Store&gt;:</h5>
            <TabbedMenu tabs={requestedTabs} contentMaxHeight={260} />
          </div>

          <div className="col-12">
            <h5>Sent Items To &lt;Store&gt;:</h5>
            <TabbedMenu tabs={sendTabs} contentMaxHeight={260} />
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
