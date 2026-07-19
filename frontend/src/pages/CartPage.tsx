import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import client from "../api/client";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";
import CheckoutForm from "../components/CheckoutForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

export default function CartPage() {
  const { items, cartTotal, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleCheckout = async () => {
    setError("");
    setFlaggedIds(new Set());
    setSubmitting(true);
    try {
      // 1. Create the order
      const orderRes = await client.post("/orders/", {
        items: items.map((e) => ({
          product_id: e.product.id,
          quantity: e.quantity,
        })),
      });
      const orderId = orderRes.data.id;

      // 2. Create the payment intent
      const piRes = await client.post(`/orders/${orderId}/create-payment-intent`);
      setClientSecret(piRes.data.client_secret);
    } catch (err) {
      if (err instanceof AxiosError) {
        const detail: string = err.response?.data?.detail || "Checkout failed";
        setError(detail);

        // Flag the specific out-of-stock product if identifiable from the error
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
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    navigate("/orders");
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
      
      {clientSecret ? (
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm 
              onSuccess={handlePaymentSuccess} 
              onCancel={() => setClientSecret(null)} 
            />
          </Elements>
        </div>
      ) : (
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
              Total: ${cartTotal.toFixed(2)}
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
      )}
    </div>
  );
}
