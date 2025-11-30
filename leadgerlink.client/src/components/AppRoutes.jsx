import React from "react";
import { Routes, Route } from "react-router-dom";

// Import page components 
import HomePage from "../pages/HomePages/Home";
import ProfilePage from "../pages/Profile";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login/Login";
import Landing from "../pages/GeneralInformation/LandingPage/Landing";
import PrivacyPolicy from "../pages/GeneralInformation/PrivacyPolicy";
import TermsOfService from "../pages/GeneralInformation/TermsOfService";
import FAQ from "../pages/GeneralInformation/FAQ";
import AboutUs from "../pages/GeneralInformation/aboutus";
import Notifications from "../pages/Notifications";
import OrganizationsList from "../pages/Organizations/OrganizationsList";

import Dashboard from "../pages/Dashboards/Dashboard";
import Reports from "../pages/Reports";
import Users from "../pages/Users/UsersList";
import Sales from "../pages/Sales/SalesList";
import SaleView from "../pages/Sales/SaleView";
import InventoryManagement from "../pages/InventoryItems/InventoryItemsList";
import Recipes from "../pages/Recipes/RecipesList";
import ApplicationAuditLogsList from "../pages/AuditLogs/ApplicationAuditLogsList";
import OrganizationAuditLogsList from "../pages/AuditLogs/OrganizationAuditLogsList";
import AccountantDashboard from "../pages/Dashboards/AccountantDashboard";
import StoreManagerDashboard from "../pages/Dashboards/StoreManagerDashboard";
import ApplicationAdminHome from "../pages/HomePages/ApplicationAdmin-Home";
import OrganizationAdminHome from "../pages/HomePages/OrganizationAdmin-Home";
import OrganizationAccountantHome from "../pages/HomePages/OrganizationAccountant-Home";
import StoreManagerHome from "../pages/HomePages/StoreManager-Home";
import StoreEmployeeHome from "../pages/HomePages/StoreEmployee-Home";
import InventoryTransfersList from "../pages/InventoryTransfers/InventoryTransfersList";
import StoresList from "../pages/Stores/StoresList";
import ProductsList from "../pages/Products/ProductsList";
import ForgetPassword from "../pages/Login/ForgetPassword";
import SalesNew from "../pages/Sales/SalesNew";
import InventoryNew from "../pages/InventoryItems/InventoryNew";
import RecipeNew from "../pages/Recipes/RecipeNew";

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
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/:id" element={<SaleView />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/termsofservice" element={<TermsOfService />} />
          <Route path="/faqs" element={<FAQ />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/organizations" element={<OrganizationsList />} />
          <Route path="/applicationauditlogs" element={<ApplicationAuditLogsList />} />
          <Route path="/applicationauditlogs" element={<ApplicationAuditLogsList />} />
          <Route path="/organizationauditlogs" element={<OrganizationAuditLogsList />} />
          <Route path="/accountant-dashboard" element={<AccountantDashboard />} />
          <Route path="/store-manager-dashboard" element={<StoreManagerDashboard />} />
          <Route path="/app-admin" element={<ApplicationAdminHome />} />
          <Route path="/org-admin" element={<OrganizationAdminHome />} />
          <Route path="/org-accountant" element={<OrganizationAccountantHome />} />
          <Route path="/store-manager" element={<StoreManagerHome />} />
          <Route path="/store-employee" element={<StoreEmployeeHome />} />
          <Route path="/inventory/transfers" element={<InventoryTransfersList />} />
          <Route path="/stores" element={<StoresList />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/reset-password" element={<ForgetPassword />} />

          <Route path="/sales/new" element={<SalesNew />} />
          <Route path="/inventory/new" element={<InventoryNew />} />
          <Route path="/recipes/new" element={<RecipeNew />} />
    </Routes>
  );
};

export default AppRoutes;