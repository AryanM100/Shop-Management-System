import type { OrderStatus } from "../types";

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
