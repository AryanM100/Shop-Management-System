import axios from "axios";

// In dev, Vite's proxy forwards /auth, /products, /orders to the backend.
// In production, set VITE_API_URL to the backend origin.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
});

export function setAuthToken(token: string): void {
  client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearAuthToken(): void {
  delete client.defaults.headers.common["Authorization"];
}

export default client;
