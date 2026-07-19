import { useEffect, useState } from "react";
import client from "../api/client";
import type { Order } from "../types";
import OrderStatusBadge from "../components/OrderStatusBadge";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    client
      .get<Order[]>("/orders/")
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading orders...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (orders.length === 0)
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">My Orders</h1>
        <p className="text-gray-500">No orders yet.</p>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === order.id ? null : order.id)
              }
            >
              <div className="flex items-center gap-4">
                <span className="font-medium">Order #{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  ${Number(order.total_amount).toFixed(2)}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {expandedId === order.id && (
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
                        <td className="py-1">
                          {item.product?.name || `Product #${item.product_id}`}
                        </td>
                        <td className="py-1">{item.quantity}</td>
                        <td className="py-1">
                          ${Number(item.unit_price_at_purchase).toFixed(2)}
                        </td>
                        <td className="py-1 text-right">
                          $
                          {(
                            Number(item.unit_price_at_purchase) * item.quantity
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
