import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AxiosError } from "axios";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"customer" | "shop_owner">("customer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, fullName, role);
      navigate("/");
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || "Registration failed");
      } else {
        setError("Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "customer" | "shop_owner")}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="customer">Customer</option>
            <option value="shop_owner">Shop Owner</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
