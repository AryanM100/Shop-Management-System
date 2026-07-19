import type { CartEntry } from "../types";
import { useCart } from "../context/CartContext";

interface Props {
  entry: CartEntry;
  flagged?: boolean;
}

export default function CartItem({ entry, flagged }: Props) {
  const { updateQuantity, removeFromCart } = useCart();
  const lineTotal = entry.product.price * entry.quantity;

  return (
    <div
      className={`flex items-center gap-4 py-3 border-b border-gray-100 ${
        flagged ? "bg-red-50 px-2 rounded" : ""
      }`}
    >
      <div className="flex-1">
        <p className="font-medium">{entry.product.name}</p>
        <p className="text-sm text-gray-500">
          ${Number(entry.product.price).toFixed(2)} each
        </p>
        {flagged && (
          <p className="text-sm text-red-600 font-medium mt-1">
            Out of stock - remove this item to continue
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
        >
          -
        </button>
        <span className="w-8 text-center">{entry.quantity}</span>
        <button
          onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
        >
          +
        </button>
      </div>
      <span className="w-20 text-right font-medium">
        ${lineTotal.toFixed(2)}
      </span>
      <button
        onClick={() => removeFromCart(entry.product.id)}
        className="text-red-500 hover:text-red-700 text-sm"
      >
        Remove
      </button>
    </div>
  );
}
