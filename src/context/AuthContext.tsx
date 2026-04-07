"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type User = {
  uid: string;
  username: string;
  email: string;
} | null;

interface AuthContextType {
  user: User;
  token: string | null;
  isLoading: boolean;
  signIn: (
    userData: { uid: string; username: string; email: string },
    token: string,
  ) => void;
  signOut: () => void;
  getAuthHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
  getAuthHeaders: () => ({}),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("algotube_user");
      const storedToken = localStorage.getItem("algotube_token");

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      }
    } catch (e) {
      console.error("[Auth] Failed to restore session:", e);
      // Clear corrupted data
      localStorage.removeItem("algotube_user");
      localStorage.removeItem("algotube_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist user + token to localStorage
  const signIn = useCallback(
    (
      userData: { uid: string; username: string; email: string },
      jwt: string,
    ) => {
      setUser({
        uid: userData.uid,
        username: userData.username,
        email: userData.email,
      });
      setToken(jwt);
      localStorage.setItem("algotube_user", JSON.stringify(userData));
      localStorage.setItem("algotube_token", jwt);
    },
    [],
  );

  // Clear session and redirect to auth page
  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("algotube_user");
    localStorage.removeItem("algotube_token");
    window.location.href = "/auth";
  }, []);

  // Helper: Get headers with JWT for authenticated API calls
  const getAuthHeaders = useCallback(
    (): HeadersInit => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token],
  );

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signIn, signOut, getAuthHeaders }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Global hooks
export const useAuth = () => useContext(AuthContext);
export const useUser = () => {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
};
