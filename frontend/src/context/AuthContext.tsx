import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import client, { setAuthToken, clearAuthToken } from "../api/client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: "customer" | "shop_owner"
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await client.get<User>("/auth/me");
    setUser(res.data);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);
        const res = await client.post<{ access_token: string }>(
          "/auth/login",
          params,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        const t = res.data.access_token;
        setToken(t);
        setAuthToken(t);
        await fetchUser();
      } finally {
        setLoading(false);
      }
    },
    [fetchUser]
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: "customer" | "shop_owner"
    ) => {
      setLoading(true);
      try {
        await client.post("/auth/register", {
          email,
          password,
          full_name: fullName,
          role,
        });
        await login(email, password);
      } finally {
        setLoading(false);
      }
    },
    [login]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
