/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount and validate token
  useEffect(() => {
    const validateSession = async () => {
      const storedUser = localStorage.getItem("currentUser");
      const storedProjectId = localStorage.getItem("selectedProjectId");
      const storedAccessToken = localStorage.getItem("accessToken");
      const storedRefreshToken = localStorage.getItem("refreshToken");

      if (storedUser && storedAccessToken) {
        try {
          // Validate token by making a lightweight API call to /users/me
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${storedAccessToken}`,
            },
          });

          if (response.ok) {
            // Token is valid, restore session
            const userData = JSON.parse(storedUser);
            setCurrentUser(userData);
            if (storedProjectId) {
              setSelectedProjectId(storedProjectId);
            }
          } else if (response.status === 401 && storedRefreshToken) {
            // Token expired, try to refresh
            try {
              const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                localStorage.setItem("accessToken", refreshData.accessToken);
                localStorage.setItem("refreshToken", refreshData.refreshToken);
                
                // Retry /users/me with new token
                const retryResponse = await fetch(`${API_BASE_URL}/users/me`, {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${refreshData.accessToken}`,
                  },
                });

                if (retryResponse.ok) {
                  const userData = JSON.parse(storedUser);
                  setCurrentUser(userData);
                  if (storedProjectId) {
                    setSelectedProjectId(storedProjectId);
                  }
                } else {
                  // Refresh failed, clear session
                  setCurrentUser(null);
                  setSelectedProjectId(null);
                  localStorage.removeItem("currentUser");
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  localStorage.removeItem("selectedProjectId");
                }
              } else {
                // Refresh failed, clear session
                setCurrentUser(null);
                setSelectedProjectId(null);
                localStorage.removeItem("currentUser");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("selectedProjectId");
              }
            } catch {
              // Network error during refresh, clear session
              setCurrentUser(null);
              setSelectedProjectId(null);
              localStorage.removeItem("currentUser");
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("selectedProjectId");
            }
          } else {
            // Token invalid and no refresh possible, clear session
            setCurrentUser(null);
            setSelectedProjectId(null);
            localStorage.removeItem("currentUser");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("selectedProjectId");
          }
        } catch (error) {
          // Network error or invalid JSON, clear session
          console.error("Session validation error:", error);
          setCurrentUser(null);
          setSelectedProjectId(null);
          localStorage.removeItem("currentUser");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("selectedProjectId");
        }
      }
      setIsLoading(false);
    };

    validateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Store user
        setCurrentUser(data.user);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        return {
          success: true,
          user: data.user,
          projects: data.projects,
          mustChangePassword: data.user.mustChangePassword,
        };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setSelectedProjectId(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("selectedProjectId");
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (!refreshTokenValue) {
        throw new Error("No refresh token");
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        return { success: true, accessToken: data.accessToken };
      } else {
        logout();
        return { success: false, error: "Session expired" };
      }
    } catch {
      logout();
      return { success: false, error: "Failed to refresh token" };
    }
  };

  const getAccessToken = () => {
    return localStorage.getItem("accessToken");
  };

  const setSelectedProject = (projectId) => {
    setSelectedProjectId(projectId);
    localStorage.setItem("selectedProjectId", projectId);
  };

  // Get all users (for admin) - API call
  const getAllUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch {
      return [];
    }
  };

  // Get user by ID - API call
  const getUserById = async (userId) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  };

  // Check if user has admin or project manager privileges
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const isProjectManager = currentUser?.role === "project_manager";
  const isSiteEngineer = currentUser?.role === "site_engineer";
  const isClient = currentUser?.role === "client";
  const canManageProjects = isAdmin || isProjectManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isProjectManager,
        isSiteEngineer,
        isClient,
        canManageProjects,
        login,
        logout,
        isLoading,
        getAllUsers,
        getUserById,
        selectedProjectId,
        setSelectedProject,
        refreshToken,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
