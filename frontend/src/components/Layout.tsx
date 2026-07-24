import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-lg">
              Shop
            </Link>
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              Products
            </Link>
            {user?.role === "customer" && (
              <>
                <Link to="/cart" className="text-sm text-gray-600 hover:text-gray-900">
                  Cart{items.length > 0 && ` (${items.length})`}
                </Link>
                <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">
                  Orders
                </Link>
              </>
            )}
            {user?.role === "shop_owner" && (
              <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500">{user.full_name} ({user.email || user.phone_number})</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Log in
                </Link>
                <Link to="/register" className="text-sm text-gray-600 hover:text-gray-900">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
