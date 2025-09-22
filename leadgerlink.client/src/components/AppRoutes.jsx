import React from "react";
import { Routes, Route } from "react-router-dom";

// Import page components 
import HomePage from "../pages/Home";
import SignupPage from "../pages/SignUp";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";
import Landing from "../pages/Landing";

import Dashboard from "../pages/Dashboard";
import Reports from "../pages/Reports";
import Users from "../pages/UserAdministration";
import Settings from "../pages/Settings";
import Sales from "../pages/Sales";
import InventoryManagement from "../pages/InventoryManagement";
import Recipes from "../pages/Recipes";
import BranchDetails from "../pages/BranchDetails";

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
          <Route path="/sales" element={<Sales />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/branchDetails" element={<BranchDetails />} />

    </Routes>
  );
};

export default AppRoutes;