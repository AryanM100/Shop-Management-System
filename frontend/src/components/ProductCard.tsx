import type { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const outOfStock = product.stock_quantity <= 0;
  const isCustomer = user?.role === "customer";

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-48 object-cover rounded mb-3"
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400">
          No image
        </div>
      )}
      <h3 className="font-semibold text-lg">{product.name}</h3>
      <p className="text-gray-600 text-sm mt-1 flex-1">{product.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-bold text-lg">${Number(product.price).toFixed(2)}</span>
        {outOfStock ? (
          <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
            Out of Stock
          </span>
        ) : isCustomer ? (
          <button
            onClick={() => addToCart(product)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
          >
            Add to Cart
          </button>
        ) : null}
      </div>
      {!outOfStock && (
        <p className="text-xs text-gray-400 mt-1">{product.stock_quantity} in stock</p>
      )}
    </div>
  );
}
