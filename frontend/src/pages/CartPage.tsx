import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import client from "../api/client";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartPage() {
  const { items, cartTotal, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const handleCheckout = async () => {
    setError("");
    setFlaggedIds(new Set());
    setSubmitting(true);
    try {
      const orderRes = await client.post("/orders/", {
        items: items.map((e) => ({
          product_id: e.product.id,
          quantity: e.quantity,
        })),
      });
      const orderId = orderRes.data.id;

      const piRes = await client.post(`/orders/${orderId}/create-payment-intent`);
      const { id: razorpayOrderId, amount, currency, razorpay_key_id } = piRes.data;

      const options = {
        key: razorpay_key_id,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Shop",
        description: `Order #${orderId}`,
        handler: function () {
          clearCart();
          navigate("/orders");
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      if (err instanceof AxiosError) {
        const detail: string = err.response?.data?.detail || "Checkout failed";
        setError(detail);

        const match = detail.match(/product (\d+)/i);
        if (match) {
          setFlaggedIds(new Set([Number(match[1])]));
        }
        const nameMatch = detail.match(/Out of stock for product (.+)/i);
        if (nameMatch) {
          const name = nameMatch[1];
          const found = items.find((e) => e.product.name === name);
          if (found) {
            setFlaggedIds(new Set([found.product.id]));
          }
        }
      } else {
        setError("Checkout failed");
      }
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Cart</h1>
        <p className="text-gray-500">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Cart</h1>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
          {flaggedIds.size > 0 && (
            <button
              onClick={() => {
                flaggedIds.forEach((id) => removeFromCart(id));
                setFlaggedIds(new Set());
                setError("");
              }}
              className="ml-3 underline font-medium"
            >
              Remove flagged items
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {items.map((entry) => (
          <CartItem
            key={entry.product.id}
            entry={entry}
            flagged={flaggedIds.has(entry.product.id)}
          />
        ))}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <span className="font-bold text-lg">
            Total: ₹{cartTotal.toFixed(2)}
          </span>
          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}