import { useState, type FormEvent } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CheckoutForm({ onSuccess, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/orders",
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "An unexpected error occurred.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 border border-gray-200 rounded-lg">
      <PaymentElement />
      {error && <div className="text-red-600 text-sm mt-3">{error}</div>}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex-1"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </form>
  );
}
