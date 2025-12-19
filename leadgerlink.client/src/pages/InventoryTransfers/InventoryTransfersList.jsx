import React, { useEffect, useState } from 'react';
import { FaExchangeAlt, FaArrowDown, FaArrowUp, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';
import InfoModal from '../../components/Ui/InfoModal';

// Inventory Transfers list
export default function InventoryTransfersList() {
  const { loggedInUser } = useAuth();
  const navigate = useNavigate();

  const isEmployee = (loggedInUser?.roles || []).includes("Store Employee");
  const isStoreManager = (loggedInUser?.roles || []).includes("Store Manager");

  // Filters
  const [transferFlow, setTransferFlow] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [transferStatusOptions, setTransferStatusOptions] = useState([{ label: 'All', value: '' }]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [rowsData, setRowsData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Add this at the top level of the component
    const [showModal, setShowModal] = useState(false);

  const transferFlowOptions = [
    { label: 'All', value: '' },
    { label: 'In', value: 'in' },
    { label: 'Out', value: 'out' },
  ];

  useEffect(() => {
    let mounted = true;
    const loadStatuses = async () => {
      try {
        const res = await fetch('/api/inventorytransfers/statuses', { credentials: 'include' });
        if (!res.ok) return;
        const arr = await res.json();
        if (!mounted) return;
        const opts = [{ label: 'All', value: '' }, ...(Array.isArray(arr) ? arr.map(s => ({ label: s, value: s })) : [])];
        setTransferStatusOptions(opts);
      } catch (err) {
        console.error('Failed to load transfer statuses', err);
      }
    };

    loadStatuses();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (transferFlow) qs.append('flow', transferFlow);
        if (transferStatus) qs.append('status', transferStatus);
        qs.append('page', String(1));
        qs.append('pageSize', String(1000));

        const res = await fetch(`/api/inventorytransfers/list-for-current-store?${qs.toString()}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to load transfers');
        }

        const json = await res.json();
        if (!mounted) return;

        setRowsData(json.items || []);
        setTotalCount((json.items || []).length);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load transfers');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [transferFlow, transferStatus]);

  // Reset page on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [transferFlow, transferStatus, entriesPerPage, searchTerm]);

  // Client-side filtering including search
  const filtered = (rowsData || []).filter(t => {
    if (transferFlow) {
      const dir = String(t.inOut || '').toLowerCase();
      if (transferFlow === 'in' && dir !== 'in') return false;
      if (transferFlow === 'out' && dir !== 'out') return false;
    }
    if (transferStatus) {
      if (String(t.status || '').toLowerCase() !== String(transferStatus).toLowerCase()) return false;
    }
    if (searchTerm && searchTerm.trim() !== '') {
      const s = searchTerm.trim().toLowerCase();
      const dateStr = t.requestedAt ? new Date(t.requestedAt).toLocaleString().toLowerCase() : '';
      const store = (t.storeInvolved ?? '').toLowerCase();
      const status = (t.status ?? '').toLowerCase();
      const driver = (t.driverName ?? '').toLowerCase();
      const inout = (t.inOut ?? '').toString().toLowerCase();
      if (!(dateStr.includes(s) || store.includes(s) || status.includes(s) || driver.includes(s) || inout.includes(s))) return false;
    }
    return true;
  });

  // Client-side paging
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / entriesPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * entriesPerPage;
  const paged = filtered.slice(start, start + entriesPerPage);

  const tableRows = paged.map((t) => {
    const inOutCell = (t.inOut || '').toString().toLowerCase() === 'in'
      ? <span className="text-success" title="In"><FaArrowDown size={18} /></span>
      : (t.inOut || '').toString().toLowerCase() === 'out'
        ? <span className="text-danger" title="Out"><FaArrowUp size={18} /></span>
        : (t.inOut ?? 'N/A');

    // Determine transfer id
    const id = t.transferId ?? t.id ?? t.inventoryTransferId ?? "";

    // Status rendering with role + direction specific CTA buttons
    const statusLower = String(t.status ?? '').toLowerCase();
    const inOutLower = String(t.inOut ?? '').toLowerCase();

    let statusCell = t.status ?? '';

    // If requester is current user's store, role is Store Manager, and status is Draft -> show Proceed button
    const currentStoreId = Number(loggedInUser?.storeId || 0);
    const requesterStoreName = String(t.storeInvolved || '');
    const isRequester = inOutLower === 'out' ? false : true; // when viewing from current store, 'In' means current store is ToStore
    const canProceed = isStoreManager && statusLower === 'draft' && isRequester && id;

    if (canProceed) {
      statusCell = (
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={() => navigate(`/inventory/transfers/send/${id}`)}
          title="Proceed to send request"
        >
          Proceed Request
        </button>
      );
    } 
    // Store Manager: if transfer is OUT and requested -> show approve button
    else if (isStoreManager && inOutLower === 'out' && statusLower === 'requested' && id) {
      statusCell = (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigate(`/inventory/transfers/approve/${id}`)}
          title="Approve transfer"
        >
          Pending - Click to approve
        </button>
      );
    }
    // Store Employee: if transfer is IN and DRAFT -> show fill button
    else if (isEmployee && inOutLower === 'in' && statusLower === 'draft' && id) {
      statusCell = (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigate(`/inventory/transfers/fill/${id}`)}
          title="Fill transfer"
        >
          Draft - Click to fill
        </button>
      );
    }
    // Store Manager: if transfer is IN, status is approved, and user is requester -> show "Set to Delivered" button
    else if (isStoreManager && inOutLower === 'in' && statusLower === 'approved' && isRequester && id) {
      statusCell = (
        <>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => setShowModal(true)}
            title="Set to Delivered"
          >
            Approved - Set to Delivered
          </button>
          <InfoModal
            show={showModal}
            title="Confirm Delivery"
            onClose={() => setShowModal(false)}
          >
            <p>Are you sure you want to mark this transfer as delivered?</p>
            <div className="d-flex justify-content-end">
              <button
                className="btn btn-secondary me-2"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowModal(false);
                  // Call API to set status to delivered
                    fetch(`/api/inventorytransfers/${id}/deliver`, {
                    method: 'POST',
                    credentials: 'include',
                  })
                    .then((res) => {
                      if (!res.ok) throw new Error('Failed to set transfer as delivered');
                      // Reload data or update state
                      window.location.reload();
                    })
                    .catch((err) => {
                      console.error(err);
                      alert('Failed to set transfer as delivered');
                    });
                }}
              >
                Confirm
              </button>
            </div>
          </InfoModal>
        </>
      );
    } else {
      // default: show plain status text (preserve original behavior)
      statusCell = t.status ?? '';
    }

    return [
      inOutCell,
      t.requestedAt ? new Date(t.requestedAt).toLocaleString() : '',
      t.storeInvolved ?? '',
      statusCell,
      t.driverName ?? 'Not assigned'
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="Inventory Transfers"
        descriptionLines={[
          'Following are inventory transfer requests between organization stores:',
          'Click on the request date of the transfer to view its details',
        ]}
        // Show "New Transfer Request" action only for non-employees
        actions={isEmployee ? [] : [{ icon: <FaPlus />, title: 'New Transfer Request', route: '/inventory/transfers/new' } ]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={(v) => setSearchTerm(v)}
        searchPlaceholder="Search by date, store, status, driver..."
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-3">
          <FilterSelect
            label="Transfer Flow"
            value={transferFlow}
            onChange={setTransferFlow}
            options={transferFlowOptions}
          />
        </div>

        <div className="col-md-3">
          <FilterSelect
            label="Transfer Status"
            value={transferStatus}
            onChange={setTransferStatus}
            options={transferStatusOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Transfers"
        columns={[
          'In/Out',
          'Requested On',
          'Store Involved',
          'Status',
          'Driver',
        ]}
        rows={tableRows}
        // Use "Requested On" column as the link column - rowLink builds route from the original data item
        linkColumnName="Requested On"
        rowLink={(_, rowIndex) => {
          const t = paged[rowIndex] || {};
          const id = t.transferId ?? t.id ?? t.inventoryTransferId ?? "";
          return id ? `/inventory/transfers/${id}` : "";
        }}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No inventory transfers to display for the selected filters.')}
      />

      <PaginationSection
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={totalFiltered}
      />
    </div>
  );
}