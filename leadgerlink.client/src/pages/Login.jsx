import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // TODO: Replace with actual authentication logic
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      // Simulate login request
      // await login(email, password);
      alert('Login successful!');
    } catch (err) {
      setError('Invalid credentials.');
    }
  };

  return (
      <div className="login-page d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
          {/* Left side image */}
          <div className="me-5 d-none d-md-block">
              <img
                  src="../../public/images/login.png" // Place your image in public/images/login_side.png
                  alt="Login Visual"
                  style={{ width: "260px", height: "auto", borderRadius: "16px", boxShadow: "0 0 16px rgba(0,0,0,0.08)" }}
              />
          </div>
          {/* Right side form */}
          <div className="login-form-container">
              <h2 className="mb-4">Login</h2>
              <form onSubmit={handleSubmit} className="login-form">
                  <div className="mb-3">
                      <label htmlFor="email" className="form-label">Email:</label>
                      <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          autoFocus
                          className="form-control"
                      />
                  </div>
                  <div className="mb-3">
                      <label htmlFor="password" className="form-label">Password:</label>
                      <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          className="form-control"
                      />
                  </div>
                  {error && <div className="error text-danger mb-3">{error}</div>}
                  <button type="submit" className="btn btn-primary w-100">Login</button>
              </form>
          </div>
      </div>
  );
};

export default Login;