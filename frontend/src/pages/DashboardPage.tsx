import { useEffect, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import client from "../api/client";
import type { Product, Order, OrderStatus } from "../types";
import OrderStatusBadge from "../components/OrderStatusBadge";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState("");

  const fetchProducts = () => {
    setLoading(true);
    client
      .get<Product[]>("/products/")
      .then((res) => setProducts(res.data))
      .catch(() => setError("Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await client.post("/products/", {
        name,
        description,
        price: Number(price),
        stock_quantity: Number(stockQuantity),
        image_url: imageUrl || null,
      });
      setName("");
      setDescription("");
      setPrice("");
      setStockQuantity("");
      setImageUrl("");
      fetchProducts();
    } catch (err) {
      if (err instanceof AxiosError) {
        setCreateError(err.response?.data?.detail || "Failed to create product");
      } else {
        setCreateError("Failed to create product");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStockSave = async (productId: number) => {
    try {
      await client.patch(`/products/${productId}`, {
        stock_quantity: Number(editStock),
      });
      setEditingId(null);
      fetchProducts();
    } catch {
      // leave inline for simplicity
    }
  };

  if (loading) return <p className="text-gray-500">Loading products...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Add Product</h3>
        {createError && (
          <p className="text-red-600 text-sm mb-2">{createError}</p>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Stock Quantity"
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm col-span-2"
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>

      <table className="w-full text-sm bg-white border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Price</th>
            <th className="text-left p-3">Stock</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="p-3">{p.name}</td>
              <td className="p-3">${Number(p.price).toFixed(2)}</td>
              <td className="p-3">
                {editingId === p.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleStockSave(p.id)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditStock(String(p.stock_quantity));
                    }}
                  >
                    {p.stock_quantity}
                  </span>
                )}
              </td>
              <td className="p-3">
                {p.is_active ? (
                  <span className="text-green-600 text-xs font-medium">
                    Active
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs font-medium">
                    Inactive
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState("");

  const fetchOrders = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    client
      .get<Order[]>("/orders/all", { params })
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleTransition = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    setUpdateError("");
    try {
      await client.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      if (err instanceof AxiosError) {
        setUpdateError(
          err.response?.data?.detail || "Failed to update status"
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <p className="text-gray-500">Loading orders...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {updateError && (
        <p className="text-red-600 text-sm">{updateError}</p>
      )}
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const transitions = VALID_TRANSITIONS[order.status];
              return (
                <tr key={order.id} className="border-t border-gray-100">
                  <td className="p-3">#{order.id}</td>
                  <td className="p-3">User #{order.user_id}</td>
                  <td className="p-3">
                    ${Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="p-3">
                    {transitions.length > 0 ? (
                      <div className="flex gap-1">
                        {transitions.map((t) => (
                          <button
                            key={t}
                            onClick={() => handleTransition(order.id, t)}
                            disabled={updatingId === order.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              t === "cancelled"
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            } disabled:opacity-50`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No actions</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<"products" | "orders">("products");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("products")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "products"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "orders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Orders
        </button>
      </div>
      {tab === "products" ? <ProductsTab /> : <OrdersTab />}
    </div>
  );
}
