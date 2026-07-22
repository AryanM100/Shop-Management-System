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

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    stockQuantity: "",
    imageUrl: "",
  });
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    client
      .get<Product[]>("/products/?include_inactive=true")
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

  const startEditing = (p: Product) => {
    setEditingProductId(p.id);
    setEditForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stockQuantity: String(p.stock_quantity),
      imageUrl: p.image_url || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    setEditError("");
    setIsSaving(true);
    try {
      await client.patch(`/products/${editingProductId}`, {
        name: editForm.name,
        description: editForm.description,
        price: Number(editForm.price),
        stock_quantity: Number(editForm.stockQuantity),
        image_url: editForm.imageUrl || null,
      });
      setEditingProductId(null);
      fetchProducts();
    } catch (err) {
      if (err instanceof AxiosError) {
        setEditError(err.response?.data?.detail || "Failed to update product");
      } else {
        setEditError("Failed to update product");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (productId: number) => {
    try {
      await client.delete(`/products/${productId}`);
      fetchProducts();
    } catch {
      // leave inline for simplicity
    }
  };

  const handleReactivate = async (productId: number) => {
    try {
      await client.patch(`/products/${productId}`, { is_active: true });
      fetchProducts();
    } catch {
      // leave inline for simplicity
    }
  };

  if (loading) return <p className="text-gray-500">Loading products...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-gray-800">Add Product</h3>
        {createError && (
          <p className="text-red-600 text-sm mb-2">{createError}</p>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Stock Quantity"
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="md:col-span-2 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">Product</th>
              <th className="text-left p-3 font-semibold text-gray-700">Price</th>
              <th className="text-left p-3 font-semibold text-gray-700">Stock</th>
              <th className="text-left p-3 font-semibold text-gray-700">Status</th>
              <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              editingProductId === p.id ? (
                <tr key={p.id}>
                  <td colSpan={5} className="p-4 bg-gray-50">
                    <div className="max-w-2xl">
                      <h4 className="font-semibold mb-3 text-sm text-gray-800">Edit Product</h4>
                      {editError && (
                        <p className="text-red-600 text-xs mb-2">{editError}</p>
                      )}
                      <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <input
                          placeholder="Description"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <input
                          placeholder="Price"
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <input
                          placeholder="Stock"
                          type="number"
                          value={editForm.stockQuantity}
                          onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <input
                          placeholder="Image URL (optional)"
                          value={editForm.imageUrl}
                          onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <div className="col-span-2 flex gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProductId(null)}
                            disabled={isSaving}
                            className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.is_active ? 'bg-gray-50/50' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gray-100 rounded shrink-0 overflow-hidden relative border border-gray-200 ${!p.is_active ? 'opacity-60 grayscale' : ''}`}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${!p.is_active ? 'text-gray-500 line-through' : 'text-gray-900'}`} title={p.name}>
                          {p.name}
                        </div>
                        <div className={`text-xs truncate ${!p.is_active ? 'text-gray-400' : 'text-gray-500'}`} title={p.description}>
                          {p.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 align-middle font-medium text-gray-900">
                    ₹{Number(p.price).toFixed(2)}
                  </td>
                  <td className="p-3 align-middle text-gray-500">
                    {p.stock_quantity}
                  </td>
                  <td className="p-3 align-middle">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 align-middle text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditing(p)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        Edit
                      </button>
                      {p.is_active ? (
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(p.id)}
                          className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        <div className="space-y-3">
            {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId == order.id ? null : order.id)}
                >
                <div className="flex items-center gap-4">
                    <span className="font-medium">Order #{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-sm text-gray-500">
                    {order.user?.full_name || `User #${order.user_id}`} ({order.user?.email})
                    <span className="text-gray-400 ml-2">
                        {new Date(order.created_at + "Z").toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
                <span className="font-medium">₹{Number(order.total_amount).toFixed(2)}</span>
                </div>
                
                {expandedId == order.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="text-left text-gray-500">
                            <th className="pb-2">Product</th>
                            <th className="pb-2">Qty</th>
                            <th className="pb-2">Unit Price</th>
                            <th className="pb-2 text-right">Subtotal</th>
                        </tr>
                        </thead>
                        <tbody>
                        {order.items.map((item) => (
                            <tr key={item.id} className="border-t border-gray-50">
                            <td className="py-1">{item.product?.name || `Product #${item.product_id}`}</td>
                            <td className="py-1">{item.quantity}</td>
                            <td className="py-1">₹{Number(item.unit_price_at_purchase).toFixed(2)}</td>
                            <td className="py-1 text-right">
                                ₹{(Number(item.unit_price_at_purchase) * item.quantity).toFixed(2)}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                )}
        
                    {(() => {
                    const transitions = VALID_TRANSITIONS[order.status];
                    return transitions.length > 0 ? (
                        <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
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
                        <p className="text-gray-400 text-xs mt-2">No actions available</p>
                    );
                    })()}
                </div>
                ))}
            </div>
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