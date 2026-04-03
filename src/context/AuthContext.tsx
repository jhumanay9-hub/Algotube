"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  uid: string;
  name: string;
  email: string;
} | null;

interface AuthContextType {
  user: User;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>({
    uid: "1",
    name: "Guest",
    email: "guest@algotube.local"
  });
  const [isLoading, setIsLoading] = useState(false);

  const signIn = () => {
    window.location.href = "/login.php";
  };

  const signOut = () => {
    setUser(null);
    window.location.href = "/logout.php";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Global hooks to replace the deprecated useUser and useAuth
export const useAuth = () => useContext(AuthContext);
export const useUser = () => {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
};
