import React, { useState } from 'react';
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
  const [requester] = useState('Current Branch');
  const [fromStore] = useState('Select store to request from');
  const [date] = useState(new Date().toISOString().slice(0,10));
  const [status] = useState('Pending');
  const [notes, setNotes] = useState('');

  // sample items
  const sampleRecipes = [
    { name: 'Recipe 1', description: 'Product description here', price: '3.000 BHD', quantity: 2, imageUrl: null },
    { name: 'Recipe 2', description: 'Product description here', price: '2.500 BHD', quantity: 4, imageUrl: null },
    { name: 'Recipe 3', description: 'Product description here', price: '1.200 BHD', quantity: 0, imageUrl: null },
    { name: 'Recipe 4', description: 'Product description here', price: '5.000 BHD', quantity: 8, imageUrl: null },
  ];

  const sampleOthers = [
    { name: 'Item A', description: 'Item description', price: '0.250 BHD', quantity: 10, imageUrl: null },
    { name: 'Item B', description: 'Item description', price: '0.750 BHD', quantity: 5, imageUrl: null },
  ];

  const tabs = [
    { label: 'Recipes', items: sampleRecipes, cardComponent: (it) => <MenuTabCard data={it} /> },
    { label: 'Others', items: sampleOthers, cardComponent: (it) => <MenuTabCard data={it} /> },
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
            <SelectField label="Requester" value={requester} onChange={() => {}} options={[{ label: requester, value: requester }]} disabled={true} />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Request From" value={fromStore} onChange={() => {}} options={[{ label: fromStore, value: '' }]} disabled={true} />
          </div>

          <div className="col-12 col-md-6">
            <InputField label="Date" value={date} onChange={() => {}} type="date" readOnly disabled />
          </div>

          <div className="col-12 col-md-6">
            <SelectField label="Status" value={status} onChange={() => {}} options={[{ label: status, value: status }]} disabled={true} />
          </div>

          <div className="col-12">
            <TabbedMenu tabs={tabs} contentMaxHeight={360} />
          </div>

          <div className="col-12">
            <TextArea label="Notes (optional)" value={notes} onChange={setNotes} rows={4} />
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
