import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import InputField from '../components/Form/InputField';
import TitledGroup from '../components/Form/TitledGroup';

/* Profile client mapping aligned to backend camelCase JSON:
   server now includes storeName; map dto.storeName into local state.
*/

const formatDateReadable = (iso) => {
  try {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  } catch {
    return iso;
  }
};

const getInitials = (firstName, lastName) => {
  const a = (firstName || '').trim();
  const b = (lastName || '').trim();
  if (!a && !b) return '';
  if (!b) return a.slice(0, 2).toUpperCase();
  return (a.charAt(0) + b.charAt(0)).toUpperCase();
};

const getAvatarColor = () => '#c6c4c0';

const Profile = () => {
  const navigate = useNavigate();
  const { loggedInUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState('');

  const [user, setUser] = useState({
    userId: null,
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    organizationName: '',
    storeName: '',
    phone: '',
    createdAt: null,
  });
  const [draft, setDraft] = useState({ ...user });

  // Extra: load org and store details for admin/manager views
  const [orgDetail, setOrgDetail] = useState(null);
  const [storeDetail, setStoreDetail] = useState(null);

  // load user detail once auth context is ready
  useEffect(() => {
    let mounted = true;

    const loadDetail = async (id) => {
      setLoading(true);
      setStatus('');
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404) {
            setStatus('User not found.');
            return;
          }
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load user (status ${res.status})`);
        }

        const dto = await res.json();
        if (!mounted) return;

        // prefer discrete firstName/lastName; fallback to splitting fullName
        let firstName = dto.firstName || '';
        let lastName = dto.lastName || '';
        if (!firstName && !lastName) {
          const full = dto.fullName || '';
          const parts = (full || '').trim().split(' ');
          firstName = parts.length > 0 ? parts[0] : '';
          lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        }

        const mapped = {
          userId: dto.userId ?? id,
          firstName,
          lastName,
          email: dto.email || '',
          role: dto.role || '',
          organizationName: dto.organizationName || '',
          storeName: dto.storeName || '', // <- now populated server-side
          phone: dto.phone || '',
          createdAt: dto.createdAt || null,
        };

        setUser(mapped);
        setDraft(mapped);
        setStatus('');
      } catch (err) {
        console.error(err);
        if (mounted) setStatus(err?.message || 'Failed to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!authLoading) {
      const isAuth = !!loggedInUser?.isAuthenticated;
      const id = loggedInUser?.userId ?? null;
      if (!isAuth || !id) {
        setLoading(false);
        setStatus('Not authenticated.');
        return;
      }
      loadDetail(id);
    }

    return () => { mounted = false; };
  }, [authLoading, loggedInUser]);

  // Load organization details if Organization Admin
  useEffect(() => {
    let mounted = true;
    const isOrgAdmin = (loggedInUser?.roles || []).includes('Organization Admin') || (user.role || '').toLowerCase().includes('organization admin');
    const orgId = loggedInUser?.orgId ?? null;
    if (!isOrgAdmin || !orgId) return;
    const loadOrg = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}`, { credentials: 'include' }).catch(() => null);
        if (!mounted || !res || !res.ok) return;
        const json = await res.json();
        setOrgDetail(json || null);
      } catch {}
    };
    loadOrg();
    return () => { mounted = false; };
  }, [loggedInUser, user.role]);

  // Load store details if Store Manager
  useEffect(() => {
    let mounted = true;
    const isStoreManager = (loggedInUser?.roles || []).includes('Store Manager') || (user.role || '').toLowerCase().includes('store manager');
    const storeId = loggedInUser?.storeId ?? null;
    if (!isStoreManager || !storeId) return;
    const loadStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`, { credentials: 'include' }).catch(() => null);
        if (!mounted || !res || !res.ok) return;
        const json = await res.json();
        setStoreDetail(json || null);
      } catch {}
    };
    loadStore();
    return () => { mounted = false; };
  }, [loggedInUser, user.role]);

  const startEdit = () => {
    setDraft({ ...user });
    setStatus('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({ ...user });
    setStatus('');
    setEditing(false);
  };

  const setField = (name, value) => {
    setDraft((d) => ({ ...d, [name]: value }));
  };

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    setStatus('');
    if (!user.userId) return setStatus('User id missing.');

    try {
      const payload = {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
      };

      const res = await fetch(`/api/users/${user.userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Server returned ${res.status}`);
      }

      // optimistic update
      setUser((u) => ({ ...u, ...payload }));
      setDraft((d) => ({ ...d, ...payload }));
      setStatus('Profile updated.');
      setEditing(false);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Failed to save profile.');
    }
  };

  const handleResetPassword = async () => {
    if (resetting) return;
    if (!user?.email) return setStatus('Email missing.');

    setResetting(true);
    setStatus('Initiating password reset...');

    try {
      await fetch('/api/users/request-password-reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.userId }),
      }).catch(() => null);

      navigate('/reset-password', { state: { email: user.email, userId: user.userId } });
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Failed to initiate reset. Server endpoint may be missing.');
    } finally {
      setResetting(false);
    }
  };

  const initials = getInitials(user.firstName, user.lastName);
  const bg = getAvatarColor();

  const subtitleParts = [];
  if (user.role) subtitleParts.push(user.role);
  if (user.storeName) subtitleParts.push(user.storeName);
  if (user.organizationName) subtitleParts.push(user.organizationName);
  const subtitle = subtitleParts.join(' , ');

  // action button minimum width for consistent appearance
  const actionBtnMinWidth = 160;

  const isOrgAdmin = (loggedInUser?.roles || []).includes('Organization Admin');
  const isStoreManager = (loggedInUser?.roles || []).includes('Store Manager');

  return (
    <div className="container py-5">
      <div className="row align-items-start mb-4">
        {/* Avatar as circular div with initials (preserve color choice) */}
        <div className="col-auto d-flex align-items-center">
          <div
            role="img"
            aria-label={`Avatar for ${user.firstName} ${user.lastName}`}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: bg,
              color: '#222',
              fontSize: 28,
              fontWeight: 600,
              userSelect: 'none',
            }}
          >
            {initials}
          </div>
        </div>

        {/* Name + conditional subtitle */}
        <div className="col text-start">
          <h1 className="fw-bold mb-1" style={{ fontSize: '2.2rem', fontStyle: 'italic' }}>
            {user.firstName} {user.lastName}
          </h1>
          {subtitle && (
            <div className="fw-semibold text-secondary mb-1" style={{ fontStyle: 'italic' }}>
              {subtitle}
            </div>
          )}
          <div className="text-muted" style={{ fontStyle: 'italic' }}>
            Created At {formatDateReadable(user.createdAt)}
          </div>
        </div>

        {/* Actions: Edit + Reset Password */}
        <div className="col-auto d-flex flex-column align-items-start" style={{ minWidth: actionBtnMinWidth }}>
          {!editing ? (
            <>
              <button
                className="btn btn-dark mb-2 w-100"
                onClick={startEdit}
                disabled={loading}
                style={{ minWidth: actionBtnMinWidth }}
              >
                Edit Details
              </button>
              <button
                className="btn btn-danger w-100"
                onClick={handleResetPassword}
                disabled={resetting || loading}
                aria-disabled={resetting || loading}
                style={{ minWidth: actionBtnMinWidth }}
              >
                {resetting ? 'Starting Reset...' : 'Reset Password'}
              </button>
            </>
          ) : (
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                onClick={saveProfile}
                style={{ minWidth: actionBtnMinWidth }}
              >
                Save
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={cancelEdit}
                style={{ minWidth: actionBtnMinWidth }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form fields - two column */}
      <form onSubmit={saveProfile}>
        {status && (
          <div className="mb-3">
            <div className="alert alert-info py-2">{status}</div>
          </div>
        )}

        <div className="row gx-4 gy-4">
          <div className="col-12 col-md-6 text-start">
            <InputField
              label={<em>First Name</em>}
              value={draft.firstName}
              onChange={(v) => setField('firstName', v)}
              readOnly={!editing}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField
              label={<em>Last Name</em>}
              value={draft.lastName}
              onChange={(v) => setField('lastName', v)}
              readOnly={!editing}
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField
              label={<em>Email</em>}
              type="email"
              value={user.email}
              readOnly
              disabled
            />
          </div>

          <div className="col-12 col-md-6 text-start">
            <InputField
              label={<em>Phone Number</em>}
              value={draft.phone}
              onChange={(v) => setField('phone', v)}
              readOnly={!editing}
            />
          </div>
        </div>
      </form>

      {/* Role-specific titled groups shown last */}
      {isOrgAdmin && orgDetail && (
        <TitledGroup title="Organization Details" className="mt-5">
          <div className="row gx-4 gy-3">
            <div className="col-12 col-md-6 text-start"><strong>Organization Name:</strong> {orgDetail.orgName ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Email:</strong> {orgDetail.email ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Phone:</strong> {orgDetail.phone ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Industry Type:</strong> {orgDetail.industryTypeName ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Registration Number:</strong> {orgDetail.regestirationNumber ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Establishment Date:</strong> {orgDetail.establishmentDate ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Website:</strong> {orgDetail.websiteUrl ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Created At:</strong> {orgDetail.createdAt ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Stores Count:</strong> {String(orgDetail.storesCount ?? 0)}</div>
            <div className="col-12 col-md-6 text-start"><strong>Users Count:</strong> {String(orgDetail.usersCount ?? 0)}</div>
          </div>
        </TitledGroup>
      )}

      {isStoreManager && storeDetail && (
        <TitledGroup title="Store Details" className="mt-5">
          <div className="row gx-4 gy-3">
            <div className="col-12 col-md-6 text-start"><strong>Store Name:</strong> {storeDetail.storeName ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Location:</strong> {storeDetail.location ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Email:</strong> {storeDetail.email ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Phone Number:</strong> {storeDetail.phoneNumber ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Opening Date:</strong> {storeDetail.openingDate ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Operational Status:</strong> {storeDetail.operationalStatusName ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Working Hours:</strong> {storeDetail.workingHours ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Created At:</strong> {storeDetail.createdAt ?? ''}</div>
            <div className="col-12 col-md-6 text-start"><strong>Updated At:</strong> {storeDetail.updatedAt ?? ''}</div>
          </div>
        </TitledGroup>
      )}
    </div>
  );
};

export default Profile;