import axios from "axios";
// All API calls go through /api, proxied to the backend in dev via vite.config.ts.
const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "") + "/api",
  withCredentials: true,
});

export default client;
