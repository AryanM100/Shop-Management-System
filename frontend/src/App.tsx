import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ProductsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute allowedRoles={["customer"]}>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={["customer"]}>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["shop_owner"]}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
