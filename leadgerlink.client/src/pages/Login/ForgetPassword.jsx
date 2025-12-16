import React, { useState, useEffect } from "react";
import "./Login.css";
import { useNavigate, useLocation } from "react-router-dom";
import { TiArrowBack } from "react-icons/ti";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [step, setStep] = useState(1); // Step 1: Request token, Step 2: Reset password
    const navigate = useNavigate();
    const location = useLocation();

    // Parse URL query parameters on page load
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const emailFromUrl = queryParams.get("email");
        const tokenFromUrl = queryParams.get("token");

        if (emailFromUrl && tokenFromUrl) {
            setEmail(emailFromUrl);
            setStep(2); // Automatically switch to Step 2
        }
    }, [location]);

    const handleRequestToken = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!email) {
            setError("Please enter your email.");
            return;
        }

        try {
            const response = await fetch("/api/auth/request-password-reset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setSuccessMessage(
                    "If the email exists, a password reset link will be sent to your inbox shortly. Please check your email in a few minutes."
                );
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Failed to request password reset.");
            }
        } catch (err) {
            setError("An error occurred while requesting the password reset.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!newPassword || !confirmPassword) {
            setError("Please fill both password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    token: new URLSearchParams(location.search).get("token"), // Extract token from URL
                    newPassword,
                }),
            });

            if (response.ok) {
                setSuccessMessage("Password reset successfully. Redirecting to login...");
                setTimeout(() => navigate("/login"), 3000); // Redirect to login after 3 seconds
            } else {
                const errorData = await response.json();
                setError(errorData.errors ? errorData.errors.join(", ") : "Failed to reset password.");
            }
        } catch (err) {
            setError("An error occurred while resetting the password.");
        }
    };

    return (
        <div className="login-page d-flex flex-wrap text-start" style={{ minHeight: "100vh" }}>
            {/* Left: Form Section */}
            <div className="colored-section p-5 d-flex align-items-center justify-content-center flex-grow-1">
                <div className="login-form-section p-4" style={{ width: "100%", maxWidth: 520 }}>
                    {/* Back icon */}
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

                    {/* Header */}
                    <div className="mb-4 text-center text-primary">
                        <h2 className="mb-1">{step === 1 ? "Request Password Reset" : "Reset Password"}</h2>
                        <hr className="bold" />
                    </div>

                    {/* Form */}
                    <form onSubmit={step === 1 ? handleRequestToken : handleResetPassword} className="login-form">
                        {/* Step 1: Request Token */}
                        {step === 1 && (
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
                        )}

                        {/* Step 2: Reset Password */}
                        {step === 2 && (
                            <>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">
                                        Email:
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        disabled
                                        className="form-control rounded-3"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="newPassword" className="form-label">
                                        New Password:
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

                                <div className="mb-3">
                                    <label htmlFor="confirmPassword" className="form-label">
                                        Confirm Password:
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
                            </>
                        )}

                        {/* Error */}
                        {error && <div className="error text-danger mb-3">{error}</div>}

                        {/* Success Message */}
                        {successMessage && <div className="text-success mb-3">{successMessage}</div>}

                        {/* Submit Button */}
                        <div className="mt-4 d-flex align-items-center justify-content-between mb-3">
                            <div /> {/* left side intentionally empty to match layout */}
                            <button
                                type="submit"
                                className="btn btn-primary rounded-3 px-4"
                                style={{ minWidth: "35%" }}
                            >
                                {step === 1 ? "Email Me a Reset Link" : "Reset Password"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right: Illustration Section */}
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