import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api"; // your backend login service
import { useAuth } from "../../Context/AuthContext"; // context we built earlier

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
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
                credentials: "include" // send cookie
            });
            const userData = await res.json();

            // 3) Save to context
            setLoggedInUser(userData);

            // 4) Navigate based on role
            if (userData.roles.includes("Admin")) {
                navigate("/dashboard");
            } else if (userData.roles.includes("Manager")) {
                navigate("/manager-homepage");
            } else if (userData.roles.includes("Employee")) {
                navigate("/employee-homepage");
            } else {
                navigate("/"); // fallback
            }
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="login-page d-flex flex-wrap" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
            {/* Left: Form Section */}
            <div className="login-form-section p-5 flex-grow-1" style={{ maxWidth: "500px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 0 12px rgba(0,0,0,0.05)" }}>
                {/* Tabs */}
                <div className="d-flex mb-4 gap-4 fw-bold fs-5">
                    <span className="text-primary border-bottom border-primary pb-1">Login</span>
                    <span className="text-secondary">Subscribe</span>
                </div>

                {/* Heading */}
                <h2 className="mb-4">Login</h2>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email:</label>
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

                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">Password:</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-control rounded-3"
                        />
                    </div>

                    {/* Forgot Password */}
                    <div className="mb-3 text-end">
                        <a href="#" className="text-success">Forget your password?</a>
                    </div>

                    {/* Error */}
                    {error && <div className="error text-danger mb-3">{error}</div>}

                    {/* Submit */}
                    <button type="submit" className="btn btn-primary w-100 rounded-3">
                        Login
                    </button>
                </form>
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
                        boxShadow: "0 0 16px rgba(0,0,0,0.08)"
                    }}
                />
            </div>
        </div>
    );
}