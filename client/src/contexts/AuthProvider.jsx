import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    apiRequest("/auth/me")
      .then((response) => {
        if (isCurrent) setUser(response.user);
      })
      .catch(() => {
        if (isCurrent) setUser(null);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (userDetails) => {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userDetails),
    });
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
