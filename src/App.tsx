import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';

// Import global CSS with Tailwind
import './assets/styles/global.css';


// Layout
import Layout from './components/layout/Layout/Layout';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Companies from './pages/Companies/Companies';
import CompanyDetails from './pages/Companies/CompanyDetails';
import Products from './pages/Products/Products';
import Categories from './pages/Categories/Categories';
import POS from './pages/POS/POS';
import QuickSale from './pages/QuickSale/QuickSale';
import Sales from './pages/Sales/Sales';
import Customers from './pages/Customers/Customers';
import CustomerLedger from './pages/Customers/CustomerLedger';
import Inventory from './pages/Inventory/Inventory';
import Purchases from './pages/Purchases/Purchases';
import Suppliers from './pages/Suppliers/Suppliers';
import Payments from './pages/Payments/Payments';
import Invoices from './pages/Invoices/Invoices';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import Settings from './pages/Settings/Settings';

// Routes
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';
import { UserRole } from './types/auth.types';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes with layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Super user only routes */}
          <Route
            path="/companies"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.SUPER_USER]}>
                <Layout>
                  <Companies />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/companies/:id"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.SUPER_USER]}>
                <Layout>
                  <CompanyDetails />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* POS route */}
          <Route
            path="/pos"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
                <Layout>
                  <POS />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/quick-sale"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
                <Layout>
                  <QuickSale />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* Products & Inventory routes */}
          <Route
            path="/products"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF]}>
                <Layout>
                  <Products />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF]}>
                <Layout>
                  <Categories />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF]}>
                <Layout>
                  <Inventory />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* Sales routes */}
          <Route
            path="/sales"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
                <Layout>
                  <Sales />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
                <Layout>
                  <Customers />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/customers/:id/ledger"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
                <Layout>
                  <CustomerLedger />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Layout>
                  <Invoices />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* Purchase routes */}
          <Route
            path="/purchases"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF]}>
                <Layout>
                  <Purchases />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/suppliers"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF]}>
                <Layout>
                  <Suppliers />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* Other routes */}
          <Route
            path="/payments"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Layout>
                  <Payments />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Layout>
                  <Reports />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <Layout>
                  <Users />
                </Layout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN]}>
                <Layout>
                  <Settings />
                </Layout>
              </RoleBasedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
