import { useState, useEffect } from "react";
import api from "../api/axios";
import { AuthContext } from "./authContextDef";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("medisave_token") || null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user && token);

  // Restore session on application mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const savedToken = localStorage.getItem("medisave_token");
      if (!savedToken) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await api.get("/auth/me");
        if (isMounted && res.data?.success && res.data?.data?.user) {
          setUser(res.data.data.user);
        } else if (isMounted) {
          localStorage.removeItem("medisave_token");
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.warn("Session restore failed:", error.response?.data?.message || error.message);
        if (isMounted) {
          localStorage.removeItem("medisave_token");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch current user helper
  const fetchCurrentUser = async () => {
    const savedToken = localStorage.getItem("medisave_token");
    if (!savedToken) {
      setUser(null);
      return null;
    }

    try {
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data?.success && res.data?.data) {
        const { user: userData, token: jwtToken } = res.data.data;
        localStorage.setItem("medisave_token", jwtToken);
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      return {
        success: false,
        message: res.data?.message || "Login failed. Please check your credentials.",
      };
    } catch (error) {
      const message =
        error.response?.data?.message || "Invalid email or password. Please try again.";
      return { success: false, message };
    }
  };

  // Registration handler
  const signup = async (formData) => {
    try {
      const res = await api.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        role: formData.role || "user",
        organizationName: formData.organizationName || "",
        organizationType: formData.organizationType || "",
        locality: formData.locality || "Katraj",
      });

      if (res.data?.success && res.data?.data) {
        const { user: userData, token: jwtToken } = res.data.data;
        localStorage.setItem("medisave_token", jwtToken);
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      return {
        success: false,
        message: res.data?.message || "Registration failed.",
      };
    } catch (error) {
      const message =
        error.response?.data?.message || "Server error during registration.";
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem("medisave_token");
    setToken(null);
    setUser(null);
  };

  // Local profile state update
  const updateProfile = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        fetchCurrentUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
