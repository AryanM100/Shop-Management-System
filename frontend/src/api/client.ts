import axios from "axios";

// In dev, Vite's proxy forwards /auth, /products, /orders to the backend.
// In production, set VITE_API_URL to the backend origin.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

export default client;
