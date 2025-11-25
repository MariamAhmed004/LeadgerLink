import React from "react";
import { Routes, Route } from "react-router-dom";

// Import page components 
import HomePage from "../pages/Home";
import ProfilePage from "../pages/Profile";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";
import Landing from "../pages/GeneralInformation/LandingPage/Landing";
import PrivacyPolicy from "../pages/GeneralInformation/PrivacyPolicy";
import TermsOfService from "../pages/GeneralInformation/TermsOfService";
import FAQ from "../pages/GeneralInformation/FAQ";
import AboutUs from "../pages/GeneralInformation/aboutus";
import Notifications from "../pages/Notifications";

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
      <Route path="/profile" element={<ProfilePage />} />
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
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/termsofservice" element={<TermsOfService />} />
          <Route path="/faqs" element={<FAQ />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/notifications" element={<Notifications />} />

    </Routes>
  );
};

export default AppRoutes;