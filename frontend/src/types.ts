export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "customer" | "shop_owner";
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "expired";

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price_at_purchase: number;
  product: Product | null;
}

export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface CartEntry {
  product: Product;
  quantity: number;
}
