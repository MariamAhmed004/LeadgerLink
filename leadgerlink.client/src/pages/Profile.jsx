import React, { useState } from 'react';

/*
  Profile view template (replaces previous Sign Up template).
  - Default layout mirrors the former sign-up card.
  - Uses mocked user data for display and inline editing.
  - No external data sources or database logic included — replace mocks with real data fetch/update later.
*/

const Profile = () => {
  // Mocked user data (replace with real fetch from API / context)
  const [user, setUser] = useState({
    avatar: '/images/avatar-placeholder.png', // replace with actual avatar URL
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'Branch Manager',
    phone: '+973 17XX XXXX',
    address: 'XXX Manama Avenue, Manama, MA 1203, Bahrain',
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user);
  const [status, setStatus] = useState(''); // success / error messages (mocked)

  const startEdit = () => {
    setDraft(user);
    setStatus('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(user);
    setStatus('');
    setEditing(false);
  };

  const handleChange = (e) => {
    setDraft({
      ...draft,
      [e.target.name]: e.target.value,
    });
  };

  const saveProfile = async (e) => {
    e?.preventDefault();
    // TODO: Replace with real update call (API / context)
    try {
      // simulate save
      await new Promise((r) => setTimeout(r, 600));
      setUser(draft);
      setStatus('Profile updated successfully (mock).');
      setEditing(false);
    } catch (err) {
      setStatus('Failed to update profile (mock).');
      console.error(err);
    }
  };

  const handleChangePassword = () => {
    // TODO: Open change-password flow/modal
    setStatus('Change password flow not implemented in template.');
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center align-items-start">
        {/* Avatar / decorative column */}
        <div className="col-md-3 d-none d-md-flex justify-content-center pe-3">
          <div className="text-center">
            <img
              src={user.avatar}
              alt="User avatar"
              style={{
                width: '160px',
                height: '160px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              }}
            />
            <div className="mt-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setStatus('Avatar upload not implemented in template.')}
              >
                Change Avatar
              </button>
            </div>
          </div>
        </div>

        {/* Profile card */}
        <div className="col-12 col-md-9">
          <div className="card shadow-sm border-primary" style={{ maxWidth: '95%', margin: '0 auto' }}>
            <div className="card-body" style={{ padding: '2rem' }}>
              <h2 className="mb-4 text-primary text-center"><strong>Profile</strong></h2>

              {/* Status messages (mock) */}
              {status && (
                <div className="mb-3">
                  <div className="alert alert-info py-2">{status}</div>
                </div>
              )}

              {/* Profile details / edit form */}
              <form onSubmit={saveProfile}>
                <div className="mb-3 row align-items-center">
                  <label className="col-sm-4 col-form-label text-start">Full Name</label>
                  <div className="col-sm-8">
                    {editing ? (
                      <input
                        name="name"
                        value={draft.name}
                        onChange={handleChange}
                        className="form-control"
                      />
                    ) : (
                      <div className="form-control-plaintext">{user.name}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3 row align-items-center">
                  <label className="col-sm-4 col-form-label text-start">Email</label>
                  <div className="col-sm-8">
                    {editing ? (
                      <input
                        type="email"
                        name="email"
                        value={draft.email}
                        onChange={handleChange}
                        className="form-control"
                      />
                    ) : (
                      <div className="form-control-plaintext">{user.email}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3 row align-items-center">
                  <label className="col-sm-4 col-form-label text-start">Role</label>
                  <div className="col-sm-8">
                    <div className="form-control-plaintext">{user.role}</div>
                  </div>
                </div>

                <div className="mb-3 row align-items-center">
                  <label className="col-sm-4 col-form-label text-start">Phone</label>
                  <div className="col-sm-8">
                    {editing ? (
                      <input
                        name="phone"
                        value={draft.phone}
                        onChange={handleChange}
                        className="form-control"
                      />
                    ) : (
                      <div className="form-control-plaintext">{user.phone}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3 row">
                  <label className="col-sm-4 col-form-label text-start">Address</label>
                  <div className="col-sm-8">
                    {editing ? (
                      <textarea
                        name="address"
                        value={draft.address}
                        onChange={handleChange}
                        rows={3}
                        className="form-control"
                      />
                    ) : (
                      <div className="form-control-plaintext">{user.address}</div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex gap-2 mt-3">
                  {editing ? (
                    <>
                      <button type="submit" className="btn btn-primary">Save</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-primary" onClick={startEdit}>Edit Profile</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={handleChangePassword}>Change Password</button>
                    </>
                  )}
                </div>
              </form>

              <hr className="mt-4" />

              <div className="small text-muted">
                {/* Guidance note for implementers */}
                This is a profile view template. Replace the mocked state and handlers with real authentication/context and API calls.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;