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
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col max-w-72 w-full">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-36 object-cover rounded mb-3"
        />
      ) : (
        <div className="w-full h-36 bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400">
          No image
        </div>
      )}
      
      <h3 className="font-semibold text-lg">{product.name}</h3>
      <p className="text-gray-600 text-sm mt-1 flex-1 mb-4">{product.description}</p>
      
      <div className="mt-auto border-t border-gray-100 pt-3">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-xl">₹{Number(product.price).toFixed(2)}</span>
          {!outOfStock && (
            <span className="text-xs text-gray-400">
              {product.stock_quantity} in stock
            </span>
          )}
        </div>
        
        {outOfStock ? (
          <div className="w-full text-center text-sm font-medium text-red-600 bg-red-50 py-2 rounded">
            Out of Stock
          </div>
        ) : isCustomer ? (
          <button
            onClick={() => addToCart(product)}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Add to Cart
          </button>
        ) : null}
      </div>
    </div>
  );
}