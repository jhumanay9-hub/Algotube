"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
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
    displayName: "admin",
    email: "admin@algotube.local"
  });
  const [isLoading, setIsLoading] = useState(false);

  const signIn = () => {
    // Implement PHP login redirection or fetch here in the future
    window.location.href = "/login.php";
  };

  const signOut = () => {
    // Implement PHP logout fetch and clear session here
    setUser(null);
    window.location.href = "/logout.php";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const useUser = () => {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
};
