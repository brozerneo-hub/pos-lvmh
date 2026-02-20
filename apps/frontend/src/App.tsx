import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy loading des pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const POSPage = lazy(() => import('./pages/POSPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const ProductsAdminPage = lazy(() => import('./pages/ProductsAdminPage'));

// Composants layout
import { UserRole } from '@pos-lvmh/shared';

import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoadingSpinner } from './components/shared/LoadingSpinner';

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Page publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées — layout AppShell */}
        <Route
          path="/"
          element={
            <ProtectedRoute minRole={UserRole.CASHIER}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<POSPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route
            path="stock"
            element={
              <ProtectedRoute minRole={UserRole.CASHIER}>
                <StockPage />
              </ProtectedRoute>
            }
          />
          {/* Routes Manager+ */}
          <Route
            path="admin/products"
            element={
              <ProtectedRoute minRole={UserRole.MANAGER}>
                <ProductsAdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
