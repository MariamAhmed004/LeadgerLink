import React, { useState } from "react";
import "./Login.css";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../services/api"; // your backend login service
import { useAuth } from "../../Context/AuthContext"; // context we built earlier

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("login"); // "login" or "subscribe"
  const navigate = useNavigate();
  const { setLoggedInUser } = useAuth(); // update context after login

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1) Call backend login API
      await api.login(email, password);

      // 2) Fetch current logged-in user info
      const res = await fetch("/api/auth/LoggedInUser", {
        credentials: "include", // send cookie
      });
      const userData = await res.json();

      // 3) Save to context
      setLoggedInUser(userData);

      // 4) Navigate based on role using freshly fetched userData (not an undefined variable)
      const roles = userData?.roles ?? [];

      const homeRoute = roles.includes("Application Admin")
        ? "/app-admin"
        : roles.includes("Organization Admin")
        ? "/org-admin"
        : roles.includes("Organization Accountant")
                  ? "/org-accountant"
        : roles.includes("Store Manager")
                      ? "/store-manager"
        : roles.includes("Store Employee")
        ? "/store-employee"
        : "/";

      navigate(homeRoute);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="login-page d-flex flex-wrap text-start">
      {/* Left: Form Section */}
      <div className="colored-section p-5 flex-grow-1">
        <div className="login-form-section p-5 flex-grow-1">
          {/* Tabs (centered, larger, bolder, no borders) */}
          <div className="d-flex mb-4 gap-4 fw-bold fs-4 justify-content-center mb-5">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`btn py-2 px-4  fs-4  ${
                tab === "login" ? "text-primary tab-underline" : "text-secondary"
              }`}
              aria-pressed={tab === "login"}
              style={{
                border: "none",
                boxShadow: "none",
                outline: "none",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setTab("subscribe")}
              className={`btn py-2 px-4  fs-4  ${
                tab === "subscribe" ? "text-primary tab-underline" : "text-secondary"
              }`}
              aria-pressed={tab === "subscribe"}
              style={{
                border: "none",
                boxShadow: "none",
                outline: "none",
              }}
            >
              Subscribe
            </button>
          </div>

          {tab === "login" ? (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email:
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="form-control rounded-3"
                  />
                </div>

                <div className="mb-5">
                  <label htmlFor="password" className="form-label">
                    Password:
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-control rounded-3"
                  />
                </div>

                {/* Error */}
                {error && <div className="error text-danger mb-3">{error}</div>}

                {/* Forgot Password + Submit on same row */}
                <div className="mt-4 d-flex align-items-center justify-content-between mb-3">
                  <Link to="/reset-password" className="text-success">Forget your password?</Link>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3 px-4"
                    style={{ minWidth: "35%" }}
                  >
                    Login
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-4 text-center">
              <h2 className="mb-3">Subscribe</h2>
              <p className="mb-0">
                To subscribe, please contact <strong>33XXXXX</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Illustration Section */}
      <div className="login-graphic-section d-none d-md-flex flex-grow-1 align-items-center justify-content-center">
        <img
          src="/images/login-illustration.png"
          alt="Login Graphic"
          style={{
            maxWidth: "500px",
            height: "auto",
            borderRadius: "16px",
            boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          }}
        />
      </div>
    </div>
  );
}