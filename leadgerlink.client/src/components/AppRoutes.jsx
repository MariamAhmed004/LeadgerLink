import React from "react";
import { Routes, Route } from "react-router-dom";

// -----------------------------
// General / Landing / Info
// -----------------------------
import Landing from "../pages/GeneralInformation/LandingPage/Landing";
import HomePage from "../pages/HomePages/Home";
import AboutUs from "../pages/GeneralInformation/aboutus";
import PrivacyPolicy from "../pages/GeneralInformation/PrivacyPolicy";
import TermsOfService from "../pages/GeneralInformation/TermsOfService";
import FAQ from "../pages/GeneralInformation/FAQ";
import NotFound from "../pages/NotFound";

// -----------------------------
// Auth / Profile
// -----------------------------
import Login from "../pages/Login/Login";
import ForgetPassword from "../pages/Login/ForgetPassword";
import ProfilePage from "../pages/Profile";

// -----------------------------
// Dashboards / Role home pages
// -----------------------------
import Dashboard from "../pages/Dashboards/Dashboard";
import AccountantDashboard from "../pages/Dashboards/AccountantDashboard";
import StoreManagerDashboard from "../pages/Dashboards/StoreManagerDashboard";
import ApplicationAdminHome from "../pages/HomePages/ApplicationAdmin-Home";
import OrganizationAdminHome from "../pages/HomePages/OrganizationAdmin-Home";
import OrganizationAccountantHome from "../pages/HomePages/OrganizationAccountant-Home";
import StoreManagerHome from "../pages/HomePages/StoreManager-Home";
import StoreEmployeeHome from "../pages/HomePages/StoreEmployee-Home";

// -----------------------------
// Users
// -----------------------------
import Users from "../pages/Users/UsersList";
import UserNew from "../pages/Users/UserNew";
import UserView from "../pages/Users/UserView";
import UserEdit from "../pages/Users/UserEdit";

// -----------------------------
// Organizations
// -----------------------------
import OrganizationsList from "../pages/Organizations/OrganizationsList";
import OrganizationNew from "../pages/Organizations/OrganizationNew";
import OrganizationView from "../pages/Organizations/OrganizationView";
import OrganizationEdit from "../pages/Organizations/OrganizationEdit";

// -----------------------------
// Audit Logs
// -----------------------------
import ApplicationAuditLogsList from "../pages/AuditLogs/ApplicationAuditLogsList";
import OrganizationAuditLogsList from "../pages/AuditLogs/OrganizationAuditLogsList";
import AuditLogView from "../pages/AuditLogs/AuditLogView";

// -----------------------------
// Sales
// -----------------------------
import Sales from "../pages/Sales/SalesList";
import SalesNew from "../pages/Sales/SalesNew";
import SaleView from "../pages/Sales/SaleView";
import SaleEdit from "../pages/Sales/SaleEdit";

// -----------------------------
// Inventory / Stores / Products
// -----------------------------

// Inventory Items
import InventoryManagement from "../pages/InventoryItems/InventoryItemsList";
import InventoryNew from "../pages/InventoryItems/InventoryNew";
import InventoryItemView from "../pages/InventoryItems/InventoryItemView";
import RestockItemsPage from "../pages/InventoryItems/RestockItemsPage";
import InventoryEdit from "../pages/InventoryItems/InventoryEdit";

// Inventory Transfers
import InventoryTransfersList from "../pages/InventoryTransfers/InventoryTransfersList";
import InventoryTransferView from "../pages/InventoryTransfers/InventoryTransferView";
import InventoryTransferNew from "../pages/InventoryTransfers/InventoryTransferNew";
import InventoryTransferApprove from "../pages/InventoryTransfers/InventoryTransferApprove";
import InventoryTransferFill from "../pages/InventoryTransfers/InventoryTransferFill";
import InventoryTransferSend from "../pages/InventoryTransfers/InventoryTransferSend";

// Stores
import StoresList from "../pages/Stores/StoresList";
import StoreNew from "../pages/Stores/StoreNew";
import StoreView from "../pages/Stores/StoreView";
import StoreEdit from "../pages/Stores/StoreEdit";

// Products
import ProductsList from "../pages/Products/ProductsList";
import ProductView from "../pages/Products/ProductView";
import ProductEdit from "../pages/Products/ProductEdit";

// -----------------------------
// Recipes
// -----------------------------
import Recipes from "../pages/Recipes/RecipesList";
import RecipeNew from "../pages/Recipes/RecipeNew";
import RecipeView from "../pages/Recipes/RecipeView";
import RecipeEdit from "../pages/Recipes/RecipeEdit";

// -----------------------------
// Notifications
// -----------------------------
import Notifications from "../pages/Notification/Notifications";
import NotificationView from "../pages/Notification/NotificationView";


//Reports
import Reports from "../pages/Reports";

const AppRoutes = () => {
  return (
    <Routes>

      {/* ---------------------------
          Public / Landing / Info
          --------------------------- */}
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/privacypolicy" element={<PrivacyPolicy />} />
      <Route path="/termsofservice" element={<TermsOfService />} />
      <Route path="/faqs" element={<FAQ />} />

      {/* ---------------------------
          Auth / Profile
          --------------------------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ForgetPassword />} />
      <Route path="/profile" element={<ProfilePage />} />

      {/* ---------------------------
          Dashboards / Role Homepages
          --------------------------- */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/accountant-dashboard" element={<AccountantDashboard />} />
      <Route path="/store-manager-dashboard" element={<StoreManagerDashboard />} />
      <Route path="/app-admin" element={<ApplicationAdminHome />} />
      <Route path="/org-admin" element={<OrganizationAdminHome />} />
      <Route path="/org-accountant" element={<OrganizationAccountantHome />} />
      <Route path="/store-manager" element={<StoreManagerHome />} />
      <Route path="/store-employee" element={<StoreEmployeeHome />} />

      {/* ---------------------------
          Users
          --------------------------- */}
      <Route path="/users" element={<Users />} />
      <Route path="/users/create" element={<UserNew />} />
      <Route path="/users/:id" element={<UserView />} />
      <Route path="/users/edit/:id" element={<UserEdit />} />

      {/* ---------------------------
          Organizations
          --------------------------- */}
      <Route path="/organizations" element={<OrganizationsList />} />
      <Route path="/organizations/new" element={<OrganizationNew />} />
          <Route path="/organizations/:id" element={<OrganizationView />} />
          <Route path="/organizations/edit/:id" element={<OrganizationEdit />} />

      {/* ---------------------------
          Audit Logs
          --------------------------- */}
      <Route path="/applicationauditlogs" element={<ApplicationAuditLogsList />} />
      <Route path="/organizationauditlogs" element={<OrganizationAuditLogsList />} />
      <Route path="/auditlogs/:id" element={<AuditLogView />} />

      {/* ---------------------------
          Sales
          --------------------------- */}
      <Route path="/sales" element={<Sales />} />
      <Route path="/sales/new" element={<SalesNew />} />
      <Route path="/sales/:id" element={<SaleView />} />
      <Route path="/sales/edit/:id" element={<SaleEdit />} />

      {/* ---------------------------
          Inventory / Stores / Products
          --------------------------- */}

          {/*Inventory Items*/}
      <Route path="/inventory" element={<InventoryManagement />} />
      <Route path="/inventory/new" element={<InventoryNew />} />
      <Route path="/inventory-items/restock" element={<RestockItemsPage />} />
          <Route path="/inventory-items/:id" element={<InventoryItemView />} />
      <Route path="/inventory-items/edit/:id" element={<InventoryEdit />} />

          {/*Inventory Transfers*/}
          <Route path="/inventory/transfers" element={<InventoryTransfersList />} />
          <Route path="/inventory/transfers/new" element={<InventoryTransferNew />} />
          <Route path="/inventory/transfers/approve/:id" element={<InventoryTransferApprove />} />
          <Route path="/inventory/transfers/fill/:id" element={<InventoryTransferFill />} />
          <Route path="/inventory/transfers/send/:id" element={<InventoryTransferSend />} />
          <Route path="/inventory/transfers/:id" element={<InventoryTransferView />} />

          {/*Stores*/}
      <Route path="/stores/" element={<StoresList />} />
          <Route path="/stores/new" element={<StoreNew />} />
          <Route path="/stores/edit/:id" element={<StoreEdit />} />
          <Route path="/stores/:id" element={<StoreView />} />

          {/*Products*/}
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/edit/:id" element={<ProductEdit />} />
          <Route path="/products/:id" element={<ProductView />} />

      {/* ---------------------------
          Recipes
          --------------------------- */}
      <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/new" element={<RecipeNew />} />
          <Route path="/recipes/edit/:id" element={<RecipeEdit />} />
          <Route path="/recipes/:id" element={<RecipeView />} />


          { /*Reports*/}
          <Route path="/reports" element={<Reports />} />

      {/* ---------------------------
          Notifications
          --------------------------- */}
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/:id" element={<NotificationView />} />

      {/* ---------------------------
          Fallback / Not found
          --------------------------- */}
      <Route path="*" element={<NotFound />} />

       

    </Routes>
  );
};

export default AppRoutes;