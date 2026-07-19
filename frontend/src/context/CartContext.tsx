import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { CartEntry, Product } from "../types";

interface CartState {
  items: CartEntry[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);

  const addToCart = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((e) => e.product.id === product.id);
      if (existing) {
        return prev.map((e) =>
          e.product.id === product.id
            ? { ...e, quantity: e.quantity + 1 }
            : e
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => prev.filter((e) => e.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((e) => e.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((e) =>
        e.product.id === productId ? { ...e, quantity } : e
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartTotal = useMemo(
    () => items.reduce((sum, e) => sum + e.product.price * e.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
