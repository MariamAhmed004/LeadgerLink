import React from "react";
import { Routes, Route } from "react-router-dom";

// Import your page components here
import HomePage from "../pages/Home";
import SignupPage from "../pages/SignUp";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";
import Landing from "../pages/Landing";

// Import new route components (create these if they don't exist)
import Dashboard from "../pages/Dashboard";
import Reports from "../pages/Reports";
import Users from "../pages/UserAdministration";
import Settings from "../pages/Settings";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/users" element={<Users />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;