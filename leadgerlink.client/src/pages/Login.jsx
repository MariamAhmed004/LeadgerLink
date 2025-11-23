import React, { useState } from 'react';
import { api } from "../services/api"; // adjust the path if needed

export default function Login() {
    // State variables
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Form submit handler
    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent page reload
        setError("");       // clear previous error

        try {
            // Call backend login API
            await api.login(email, password);

            // Success feedback
            alert("Logged in successfully!");
            // Optional: redirect to dashboard if using react-router
            // navigate("/dashboard");
        } catch (err) {
            // Show backend error
            setError(err.message || "Login failed. Please try again.");
        }
    };

    return (
        <div
            className="login-page d-flex align-items-center justify-content-center"
            style={{ minHeight: "70vh" }}
        >
            {/* Left side image */}
            <div className="me-5 d-none d-md-block">
                <img
                    src="/images/login.png" // place image in public/images
                    alt="Login Visual"
                    style={{
                        width: "260px",
                        height: "auto",
                        borderRadius: "16px",
                        boxShadow: "0 0 16px rgba(0,0,0,0.08)",
                    }}
                />
            </div>

            {/* Right side form */}
            <div className="login-form-container">
                <h2 className="mb-4">Login</h2>
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
                            className="form-control"
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">
                            Password:
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-control"
                        />
                    </div>

                    {error && <div className="error text-danger mb-3">{error}</div>}

                    <button type="submit" className="btn btn-primary w-100">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}