import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { TiArrowBack } from "react-icons/ti";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basic validation placeholders
        if (!email) {
            setError("Please enter your email.");
            return;
        }

        // Optional: simple email format check (replace with more robust validation if needed)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!newPassword || !confirmPassword) {
            setError("Please fill both password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        // TODO: Implement actual reset logic
        // - Possibly request a reset token using the email, or submit the token + new password.
        // - Call backend API here, e.g. await api.resetPassword({ email, newPassword, token });
        // - Handle API errors and success states accordingly.

        // Placeholder behavior: navigate back to login after "success"
        navigate("/login");
    };

    return (
        <div className="login-page d-flex flex-wrap text-start">
            {/* Left: Form Section (keeps same structure as Login page) */}
            <div className="colored-section p-5 flex-grow-1">
                <div className="login-form-section p-5 flex-grow-1" style={{ position: "relative" }}>
                    {/* Back icon (top-right) */}
                    <button
                        type="button"
                        aria-label="Back to login"
                        onClick={() => navigate("/login")}
                        style={{
                            position: "absolute",
                            top: "1rem",
                            right: "1rem",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: 0,
                        }}
                        title="Back to login"
                    >
                        <TiArrowBack size={34} className="mt-2 me-2 text-primary" />
                    </button>

                    {/* Header with horizontal line under it */}
                    <div className="mb-4 text-center text-primary">
                        <h2 className="mb-1">Reset Password</h2>
                        <hr className="bold" />
                    </div>

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
                                className="form-control rounded-3"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">
                                New password:
                            </label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="form-control rounded-3"
                            />
                        </div>

                        <div className="mb-5">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm password:
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="form-control rounded-3"
                            />
                        </div>

                        {/* Error */}
                        {error && <div className="error text-danger mb-3">{error}</div>}

                        {/* Submit button in the same placement as Login page */}
                        <div className="mt-4 d-flex align-items-center justify-content-between mb-3">
                            <div /> {/* left side intentionally empty to match layout */}
                            <button
                                type="submit"
                                className="btn btn-primary rounded-3 px-4"
                                style={{ minWidth: "35%" }}
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right: Illustration Section - reuse same image area as Login */}
            <div className="login-graphic-section d-none d-md-flex flex-grow-1 align-items-center justify-content-center">
                <img
                    src="/images/login-illustration.png"
                    alt="Reset Password Graphic"
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