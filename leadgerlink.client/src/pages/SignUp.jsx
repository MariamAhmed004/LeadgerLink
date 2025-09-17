import React, { useState } from 'react';

const SignUp = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    // TODO: Replace with actual sign-up API call
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Account created successfully!');
      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
        setError('Sign up failed. Please try again.');
        console.log(err);
    }
  };

    return (
        <div className="container py-5">
            <div className="row justify-content-center align-items-center">
                {/* Decorative image on the left */}
                <div className="col-md-3 d-none d-md-block text-center pe-3">
                    <img
                        src="../../public/images/signup.png"
                        alt="Sign Up Decor"
                        style={{
                            width: "100%",
                            maxWidth: "40em",
                            borderRadius: "16px",
                            boxShadow: "0 0 16px rgba(0,0,0,0.10)"
                        }}
                    />
                </div>
                {/* Sign Up Form */}
                <div className="col-md-9">
                    <div
                        className="card shadow-sm border-primary"
                        style={{ maxWidth: "95%", margin: "0 auto" }}
                    >
                        <div className="card-body" style={{ padding: "2rem" }}>
                            <h2 className="mb-4 text-primary text-center"> <strong> Sign Up</strong> </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3 row align-items-center">
                                    <label htmlFor="name" className="col-sm-4 col-form-label text-start">
                                        Name
                                    </label>
                                    <div className="col-sm-8">
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="mb-3 row align-items-center">
                                    <label htmlFor="email" className="col-sm-4 col-form-label text-start">
                                        Email
                                    </label>
                                    <div className="col-sm-8">
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="mb-3 row align-items-center">
                                    <label htmlFor="password" className="col-sm-4 col-form-label text-start">
                                        Password
                                    </label>
                                    <div className="col-sm-8">
                                        <input
                                            type="password"
                                            name="password"
                                            id="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="mb-3 row align-items-center">
                                    <label htmlFor="confirmPassword" className="col-sm-4 col-form-label text-start">
                                        Confirm Password
                                    </label>
                                    <div className="col-sm-8">
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            id="confirmPassword"
                                            value={form.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                {error && <div className="alert alert-danger py-2">{error}</div>}
                                {success && <div className="alert alert-success py-2">{success}</div>}
                                <button type="submit" className="btn btn-primary mt-3"
                                    style={{ width:"35%" }}>
                                    Sign Up
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;