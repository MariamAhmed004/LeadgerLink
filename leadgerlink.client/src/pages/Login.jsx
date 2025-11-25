import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api"; // your backend login service
import { useAuth } from "../Context/AuthContext"; // context we built earlier

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
        <div
            className="login-page d-flex align-items-center justify-content-center"
            style={{ minHeight: "70vh" }}
        >
            {/* Left side image */}
            <div className="me-5 d-none d-md-block">
                <img
                    src="/images/login.png"
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
                        <label htmlFor="email" className="form-label">Email:</label>
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
                        <label htmlFor="password" className="form-label">Password:</label>
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