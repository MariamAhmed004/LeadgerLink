import React from "react";
import { Routes, Route } from "react-router-dom";
import RoleBasedRoute from "./RoleBasedRoute";

// -----------------------------
// General / Landing / Info
// -----------------------------
import Landing from "../../pages/GeneralInformation/LandingPage/Landing";
import AboutUs from "../../pages/GeneralInformation/aboutus";
import PrivacyPolicy from "../../pages/GeneralInformation/PrivacyPolicy";
import TermsOfService from "../../pages/GeneralInformation/TermsOfService";
import FAQ from "../../pages/GeneralInformation/FAQ";
import NotFound from "../../pages/NotFound";

// -----------------------------
// Auth / Profile
// -----------------------------
import Login from "../../pages/Login/Login";
import ForgetPassword from "../../pages/Login/ForgetPassword";
import ProfilePage from "../../pages/Profile";

// -----------------------------
// Dashboards / Role home pages
// -----------------------------
import AccountantDashboard from "../../pages/Dashboards/AccountantDashboard";
import StoreManagerDashboard from "../../pages/Dashboards/StoreManagerDashboard";
import ApplicationAdminHome from "../../pages/HomePages/ApplicationAdmin-Home";
import OrganizationAdminHome from "../../pages/HomePages/OrganizationAdmin-Home";
import OrganizationAccountantHome from "../../pages/HomePages/OrganizationAccountant-Home";
import StoreManagerHome from "../../pages/HomePages/StoreManager-Home";
import StoreEmployeeHome from "../../pages/HomePages/StoreEmployee-Home";

// -----------------------------
// Users
// -----------------------------
import Users from "../../pages/Users/UsersList";
import UserNew from "../../pages/Users/UserNew";
import UserView from "../../pages/Users/UserView";
import UserEdit from "../../pages/Users/UserEdit";

// -----------------------------
// Organizations
// -----------------------------
import OrganizationsList from "../../pages/Organizations/OrganizationsList";
import OrganizationNew from "../../pages/Organizations/OrganizationNew";
import OrganizationView from "../../pages/Organizations/OrganizationView";
import OrganizationEdit from "../../pages/Organizations/OrganizationEdit";

// -----------------------------
// Audit Logs
// -----------------------------
import ApplicationAuditLogsList from "../../pages/AuditLogs/ApplicationAuditLogsList";
import OrganizationAuditLogsList from "../../pages/AuditLogs/OrganizationAuditLogsList";
import AuditLogView from "../../pages/AuditLogs/AuditLogView";

// -----------------------------
// Sales
// -----------------------------
import Sales from "../../pages/Sales/SalesList";
import SalesNew from "../../pages/Sales/SalesNew";
import SaleView from "../../pages/Sales/SaleView";
import SaleEdit from "../../pages/Sales/SaleEdit";

// -----------------------------
// Inventory / Stores / Products
// -----------------------------

// Inventory Items
import InventoryManagement from "../../pages/InventoryItems/InventoryItemsList";
import InventoryNew from "../../pages/InventoryItems/InventoryNew";
import InventoryItemView from "../../pages/InventoryItems/InventoryItemView";
import RestockItemsPage from "../../pages/InventoryItems/RestockItemsPage";
import InventoryEdit from "../../pages/InventoryItems/InventoryEdit";

// Inventory Transfers
import InventoryTransfersList from "../../pages/InventoryTransfers/InventoryTransfersList";
import InventoryTransferView from "../../pages/InventoryTransfers/InventoryTransferView";
import InventoryTransferNew from "../../pages/InventoryTransfers/InventoryTransferNew";
import InventoryTransferApprove from "../../pages/InventoryTransfers/InventoryTransferApprove";
import InventoryTransferFill from "../../pages/InventoryTransfers/InventoryTransferFill";
import InventoryTransferSend from "../../pages/InventoryTransfers/InventoryTransferSend";

// Stores
import StoresList from "../../pages/Stores/StoresList";
import StoreNew from "../../pages/Stores/StoreNew";
import StoreView from "../../pages/Stores/StoreView";
import StoreEdit from "../../pages/Stores/StoreEdit";

// Products
import ProductsList from "../../pages/Products/ProductsList";
import ProductView from "../../pages/Products/ProductView";
import ProductEdit from "../../pages/Products/ProductEdit";

// -----------------------------
// Recipes
// -----------------------------
import Recipes from "../../pages/Recipes/RecipesList";
import RecipeNew from "../../pages/Recipes/RecipeNew";
import RecipeView from "../../pages/Recipes/RecipeView";
import RecipeEdit from "../../pages/Recipes/RecipeEdit";

// -----------------------------
// Notifications
// -----------------------------
import Notifications from "../../pages/Notification/Notifications";
import NotificationView from "../../pages/Notification/NotificationView";

// Reports
import Reports from "../../pages/Reports";

const AppRoutes = () => {
  return (
    <Routes>

      {/* ---------------------------
          Public / Landing / Info
          --------------------------- */}
      <Route path="/" element={<Landing />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/privacypolicy" element={<PrivacyPolicy />} />
      <Route path="/termsofservice" element={<TermsOfService />} />
      <Route path="/faqs" element={<FAQ />} />

      {/* ---------------------------
          Auth / Profile
          --------------------------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ForgetPassword />} />
      <Route path="/profile" element={<RoleBasedRoute element={<ProfilePage />} />} />

      {/* ---------------------------
          Dashboards / Role Homepages
          --------------------------- */}

          <Route path="/accountant-dashboard" element={<RoleBasedRoute element={<AccountantDashboard />} allowedRoles={["Organization Accountant", "Organization Admin"]} />} />

          <Route path="/store-manager-dashboard" element={<RoleBasedRoute element={<StoreManagerDashboard />} allowedRoles={["Store Manager"]} />} />

          <Route path="/app-admin" element={<RoleBasedRoute element={<ApplicationAdminHome />} allowedRoles={["Application Admin"]} />} />

          <Route path="/org-admin" element={<RoleBasedRoute element={<OrganizationAdminHome />} allowedRoles={["Organization Admin"]} />} />

          <Route path="/org-accountant" element={<RoleBasedRoute element={<OrganizationAccountantHome />} allowedRoles={["Organization Accountant"]} />} />

          <Route path="/store-manager" element={<RoleBasedRoute element={<StoreManagerHome />} allowedRoles={["Store Manager"]} />} />

          <Route path="/store-employee" element={<RoleBasedRoute element={<StoreEmployeeHome />} allowedRoles={["Store Employee"]} />} />

      {/* ---------------------------
          Users
          --------------------------- */}
          <Route path="/users" element={<RoleBasedRoute element={<Users />} allowedRoles={["Application Admin", "Organization Admin", "Organization Accountant", "Store Manager"]} />} />

          <Route path="/users/create" element={<RoleBasedRoute element={<UserNew />} allowedRoles={["Application Admin", "Organization Admin", "Organization Accountant", "Store Manager"]} />} />

          <Route path="/users/:id" element={<RoleBasedRoute element={<UserView />} allowedRoles={["Application Admin", "Organization Admin", "Organization Accountant", "Store Manager"]} />} />

          <Route path="/users/edit/:id" element={<RoleBasedRoute element={<UserEdit />} allowedRoles={["Application Admin", "Organization Admin", "Organization Accountant", "Store Manager"]} />} />

      {/* ---------------------------
          Organizations
          --------------------------- */}
          <Route path="/organizations" element={<RoleBasedRoute element={<OrganizationsList />} allowedRoles={["Application Admin"]} />} />

          <Route path="/organizations/new" element={<RoleBasedRoute element={<OrganizationNew />} allowedRoles={["Application Admin"]} />} />

          <Route path="/organizations/:id" element={<RoleBasedRoute element={<OrganizationView />} allowedRoles={["Application Admin"]} />} />

          <Route path="/organizations/edit/:id" element={<RoleBasedRoute element={<OrganizationEdit />} allowedRoles={["Application Admin"]} />} />

      {/* ---------------------------
          Audit Logs
          --------------------------- */}
          <Route path="/applicationauditlogs" element={<RoleBasedRoute element={<ApplicationAuditLogsList />} allowedRoles={["Application Admin"]} />} />

          <Route path="/organizationauditlogs" element={<RoleBasedRoute element={<OrganizationAuditLogsList />} allowedRoles={["Organization Admin"]} />} />

          <Route path="/auditlogs/:id" element={<RoleBasedRoute element={<AuditLogView />} allowedRoles={["Application Admin", "Organization Admin"]} />} />

      {/* ---------------------------
          Sales
          --------------------------- */}
          <Route path="/sales" element={<RoleBasedRoute element={<Sales />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/sales/new" element={<RoleBasedRoute element={<SalesNew />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/sales/:id" element={<RoleBasedRoute element={<SaleView />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/sales/edit/:id" element={<RoleBasedRoute element={<SaleEdit />} allowedRoles={["Organization Admin", "Store Manager"]} />} />

      {/* ---------------------------
          Inventory / Stores / Products
          --------------------------- */}

          {/*Inventory Items*/}
          <Route path="/inventory" element={<RoleBasedRoute element={<InventoryManagement />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/inventory/new" element={<RoleBasedRoute element={<InventoryNew />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/inventory-items/restock" element={<RoleBasedRoute element={<RestockItemsPage />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/inventory-items/:id" element={<RoleBasedRoute element={<InventoryItemView />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/inventory-items/edit/:id" element={<RoleBasedRoute element={<InventoryEdit />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          {/*Inventory Transfers*/}
          <Route path="/inventory/transfers" element={<RoleBasedRoute element={<InventoryTransfersList />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/inventory/transfers/new" element={<RoleBasedRoute element={<InventoryTransferNew />} allowedRoles={["Organization Admin", "Store Manager"]} />} />

          <Route path="/inventory/transfers/approve/:id" element={<RoleBasedRoute element={<InventoryTransferApprove />} allowedRoles={["Organization Admin", "Store Manager"]} />} />

          <Route path="/inventory/transfers/fill/:id" element={<RoleBasedRoute element={<InventoryTransferFill />} allowedRoles={["Store Employee"]} />} />

          <Route path="/inventory/transfers/send/:id" element={<RoleBasedRoute element={<InventoryTransferSend />} allowedRoles={["Store Manager"]} />} />

          <Route path="/inventory/transfers/:id" element={<RoleBasedRoute element={<InventoryTransferView />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          {/*Stores*/}
          <Route path="/stores/" element={<RoleBasedRoute element={<StoresList />} allowedRoles={["Organization Admin"]} />} />

          <Route path="/stores/new" element={<RoleBasedRoute element={<StoreNew />} allowedRoles={["Organization Admin"]} />} />

          <Route path="/stores/edit/:id" element={<RoleBasedRoute element={<StoreEdit />} allowedRoles={["Organization Admin"]} />} />

          <Route path="/stores/:id" element={<RoleBasedRoute element={<StoreView />} allowedRoles={["Organization Admin"]} />} />

          {/*Products*/}
          <Route path="/products" element={<RoleBasedRoute element={<ProductsList />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/products/edit/:id" element={<RoleBasedRoute element={<ProductEdit />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/products/:id" element={<RoleBasedRoute element={<ProductView />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

      {/* ---------------------------
          Recipes
          --------------------------- */}
          <Route path="/recipes" element={<RoleBasedRoute element={<Recipes />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/recipes/new" element={<RoleBasedRoute element={<RecipeNew />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/recipes/edit/:id" element={<RoleBasedRoute element={<RecipeEdit />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />

          <Route path="/recipes/:id" element={<RoleBasedRoute element={<RecipeView />} allowedRoles={["Organization Admin", "Store Manager", "Store Employee"]} />} />


          { /*Reports*/}
          <Route path="/reports" element={<RoleBasedRoute element={<Reports />} allowedRoles={["Organization Admin", "Organization Accountant", "Store Manager"]} />} />

      {/* ---------------------------
          Notifications
          --------------------------- */}
          <Route path="/notifications" element={<RoleBasedRoute element={<Notifications />} />} />

          <Route path="/notifications/:id" element={<RoleBasedRoute element={<NotificationView />}  />} />

      {/* ---------------------------
          Fallback / Not found
          --------------------------- */}
      <Route path="*" element={<NotFound />} />

       

    </Routes>
  );
};

export default AppRoutes;