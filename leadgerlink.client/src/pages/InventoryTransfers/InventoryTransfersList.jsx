import React, { useEffect, useState } from 'react';
import { FaExchangeAlt, FaArrowDown, FaArrowUp, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

import PageHeader from '../../components/Listing/PageHeader';
import FilterSection from '../../components/Listing/FilterSection';
import FilterSelect from '../../components/Listing/FilterSelect';
import EntityTable from '../../components/Listing/EntityTable';
import PaginationSection from '../../components/Listing/PaginationSection';
import InfoModal from '../../components/Ui/InfoModal';

// --------------------------------------------------
// InventoryTransfersList
// Summary:
// - Lists inventory transfer requests for the current store.
// - Supports filtering by flow (in/out), status and search, client-side paging,
//   and provides role-based action buttons (send/fill/approve/deliver).
// --------------------------------------------------
// Inventory Transfers list
export default function InventoryTransfersList() {
  const { loggedInUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --------------------------------------------------
  // ROLE FLAGS
  // --------------------------------------------------
  // quick checks for role-specific UI
  const isEmployee = (loggedInUser?.roles || []).includes("Store Employee");
    const isStoreManager = (loggedInUser?.roles || []).includes("Store Manager");
    const isOrgAdmin = (loggedInUser?.roles || []).includes("Organization Admin");

    // hide the In/Out column for organization admins
    const showInOut = !isOrgAdmin;

  // render status as colored badge/tag
  const renderStatusTag = (status) => {
    const s = String(status ?? '').toLowerCase();
    let cls = 'bg-secondary text-white';
    switch (s) {
      case 'draft':
        cls = 'bg-secondary text-white';
        break;
      case 'requested':
        cls = 'bg-primary text-white';
        break;
      case 'approved':
        cls = 'bg-success text-white';
        break;
      case 'delivered':
        cls = 'bg-info text-white';
        break;
      case 'rejected':
        cls = 'bg-danger text-white';
        break;
      default:
        cls = 'bg-secondary text-white';
        break;
    }
    return <span className={`badge ${cls}`}>{status ?? 'N/A'}</span>;
  };

  // --------------------------------------------------
  // FILTER STATE
  // --------------------------------------------------
  // selected transfer flow (in/out) filter
  const [transferFlow, setTransferFlow] = useState('');
  // selected transfer status filter
  const [transferStatus, setTransferStatus] = useState('');
  const [transferStatusOptions, setTransferStatusOptions] = useState([{ label: 'All', value: '' }]);
  // free-text search input
  const [searchTerm, setSearchTerm] = useState('');

  // --------------------------------------------------
  // PAGINATION STATE
  // --------------------------------------------------
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --------------------------------------------------
  // DATA STATE
  // --------------------------------------------------
  // raw rows loaded from server (unpaged)
  const [rowsData, setRowsData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // modal visibility state used for delivery confirmation
  const [showModal, setShowModal] = useState(false);
  // transient success alert shown on page
  const [successAlert, setSuccessAlert] = useState('');
  const [toastInfo, setToastInfo] = useState(null); // { title, message, notified }

  // --------------------------------------------------
  // CONSTANTS: flow options
  // --------------------------------------------------
  const transferFlowOptions = [
    { label: 'All', value: '' },
    { label: 'In', value: 'in' },
    { label: 'Out', value: 'out' },
  ];

  // --------------------------------------------------
  // EFFECT: load available transfer statuses for filter
  // --------------------------------------------------
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

  // --------------------------------------------------
  // EFFECT: load transfers list (unpaged) from server
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // build querystring from active filters (server gives full list for client-side filtering)
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

        // store the returned items for client-side processing
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

  // --------------------------------------------------
  // EFFECT: reset page when filters or search change
  // --------------------------------------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [transferFlow, transferStatus, entriesPerPage, searchTerm]);

  // --------------------------------------------------
  // DATA PROCESSING: client-side filtering and paging
  // --------------------------------------------------
  const filtered = (rowsData || []).filter(t => {
    // flow filtering (normalize to lowercase)
    if (transferFlow) {
      const dir = String(t.inOut || '').toLowerCase();
      if (transferFlow === 'in' && dir !== 'in') return false;
      if (transferFlow === 'out' && dir !== 'out') return false;
    }
    // status filtering (case-insensitive)
    if (transferStatus) {
      if (String(t.status || '').toLowerCase() !== String(transferStatus).toLowerCase()) return false;
    }
    // free-text search across useful fields
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

  // paging calculations on filtered result
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / entriesPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * entriesPerPage;
  const paged = filtered.slice(start, start + entriesPerPage);

  // --------------------------------------------------
  // RENDER PREPARATION: build table rows with role-aware actions
  // --------------------------------------------------
  const tableRows = paged.map((t) => {
    // In/Out icon cell (green down / red up)
    const inOutCell = (t.inOut || '').toString().toLowerCase() === 'in'
      ? <span className="text-success" title="In"><FaArrowDown size={18} /></span>
      : (t.inOut || '').toString().toLowerCase() === 'out'
        ? <span className="text-danger" title="Out"><FaArrowUp size={18} /></span>
        : (t.inOut ?? 'N/A');

    // Determine transfer id robustly from possible fields
    const id = t.transferId ?? t.id ?? t.inventoryTransferId ?? "";

    // Prepare status cell with conditional CTA buttons depending on role and direction
    const statusLower = String(t.status ?? '').toLowerCase();
    const inOutLower = String(t.inOut ?? '').toLowerCase();

    let statusCell = t.status ?? '';

    // Identify whether current store is the requester (approximation)
    const currentStoreId = Number(loggedInUser?.storeId || 0);
    const requesterStoreName = String(t.storeInvolved || '');
    const isRequester = inOutLower === 'out' ? false : true; // when viewing from current store, 'In' means current store is ToStore

    // Proceed button for requester store manager when draft
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
    // Approve action for store manager when OUT transfer is requested
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
    // Fill action for store employee when IN transfer is draft
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
    // Deliver action for store manager when IN and approved; shows a modal to confirm
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
                        // Replace the existing .then((res) => { ... }) block inside the Confirm button onClick with this:
                        .then((res) => {
                            if (!res.ok) throw new Error('Failed to set transfer as delivered');

                            // Show inline success alert under header and a header-mounted toast describing who was notified.
                            setSuccessAlert('Transfer marked as delivered.');
                            setToastInfo({
                                title: 'Transfer Delivered',
                                message: 'Transfer marked as delivered.',
                                notified: 'Store managers'
                            });

                            // Clear inline alert then clear toast and refresh so user sees the messages briefly.
                            setTimeout(() => setSuccessAlert(''), 1800);
                            setTimeout(() => {
                                setToastInfo(null);
                                window.location.reload();
                            }, 2200);
                        })
                }}
              >
                Confirm
              </button>
            </div>
          </InfoModal>
        </>
      );
    } else {
      // default: show colored tag for status
      statusCell = renderStatusTag(t.status);
    }

    // Build base cells (excluding In/Out)
    const baseCells = [
      t.requestedAt ? new Date(t.requestedAt).toLocaleString() : '',
      t.storeInvolved ?? '',
      statusCell,
      t.driverName ?? 'Not assigned'
    ];

    // Prepend In/Out cell only when allowed
    const finalRow = showInOut ? [inOutCell, ...baseCells] : baseCells;

    // Return the row cells in the order expected by EntityTable
    return finalRow;
  });

  // --------------------------------------------------
  // EFFECT: handle location state on mount (for success toast)
  // --------------------------------------------------
    useEffect(() => {
        try {
            const st = location?.state?.toast;
            if (st && (st.title || st.message)) {
                // Inline success alert under header
                setSuccessAlert(st.message || st.title || 'Operation completed.');
                // Toast box under header showing who was notified (prefer explicit 'notified' field, fall back to message)
                setToastInfo({
                    title: st.title || 'Notification',
                    message: st.message || '',
                    notified: st.notified || st.message || ''
                });

                // Clear navigation state so it doesn't reappear on refresh
                navigate(location.pathname, { replace: true, state: null });

                // Lifetimes: keep inline alert shorter than toast
                setTimeout(() => setSuccessAlert(''), 4200);
                setTimeout(() => setToastInfo(null), 6200);
            }
        } catch {
            // ignore
        }
    }, [location, navigate]);
   


  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaExchangeAlt size={45} />}
        title="Inventory Transfers"
        descriptionLines={[
          'Following are inventory transfer requests between organization stores:',
          'Click on the request date of the transfer to view its details',
        ]}
        // Show "New Transfer Request" action only for non-employees and non-admins
        actions={(isEmployee || isOrgAdmin) ? [] : [{ icon: <FaPlus />, title: 'New Transfer Request', route: '/inventory/transfers/new' }]}
          />
          {successAlert && (
              <div className="alert alert-success my-2" role="alert">
                  {successAlert}
              </div>
          )}

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
        columns={ showInOut
                  ? ['In/Out', 'Requested On', 'Store Involved', 'Status', 'Driver']
                  : ['Requested On', 'Store Involved', 'Status', 'Driver'] }
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
          
          {toastInfo && (
              <div
                  style={{
                      position: 'fixed',
                      bottom: '1rem',
                      right: '1rem',
                      zIndex: 1080,
                      maxWidth: '360px',
                      width: 'min(95%, 360px)',
                      padding: 0,
                      pointerEvents: 'auto'
                  }}
              >
                  <div
                      className="toast show"
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                      style={{
                          background: '#ffffff',
                          borderRadius: 8,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          overflow: 'hidden'
                      }}
                  >
                      <div
                          className="toast-header"
                          style={{
                              background: '#f8f9fa',
                              borderBottom: '1px solid rgba(0,0,0,0.04)',
                              padding: '0.5rem 0.75rem',
                              alignItems: 'center'
                          }}
                      >
                          <strong className="me-auto" style={{ fontSize: '0.95rem' }}>{toastInfo.title}</strong>
                          <small className="text-muted" style={{ marginRight: '0.5rem' }}>Now</small>
                          <button
                              type="button"
                              className="btn-close"
                              aria-label="Close"
                              onClick={() => setToastInfo(null)}
                              style={{ marginLeft: 0 }}
                          />
                      </div>

                      <div
                          className="toast-body"
                          style={{
                              padding: '0.75rem',
                              color: '#212529',
                              fontSize: '0.95rem'
                          }}
                      >
                          <div>{toastInfo.message}</div>
                          {toastInfo.notified && (
                              <small className="text-muted d-block mt-2">Notified: {toastInfo.notified}</small>
                          )}
                      </div>
                  </div>
              </div>
          )}

    </div>
  );
}
