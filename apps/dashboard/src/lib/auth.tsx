"use client";

import axios, { AxiosInstance } from "axios";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, user: { id: string; email: string }) => void;
  logout: () => void;
  refreshTokens: () => Promise<boolean>;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const STORAGE_KEY = "permit_dashboard_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    refreshToken: null,
  });

  // Create axios instance with interceptors
  const api = React.useMemo(() => {
    const instance = axios.create({
      baseURL: `${API_URL}`,
      headers: { "Content-Type": "application/json" },
    });

    // Request interceptor to add token
    instance.interceptors.request.use((config) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { accessToken } = JSON.parse(stored);
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
      return config;
    });

    // Response interceptor for auto-refresh
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const { refreshToken } = JSON.parse(stored);
            if (refreshToken) {
              try {
                const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

                const parsedStored = JSON.parse(stored);
                parsedStored.accessToken = newAccessToken;
                parsedStored.refreshToken = newRefreshToken;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedStored));

                setState(prev => ({ ...prev, accessToken: newAccessToken, refreshToken: newRefreshToken }));
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return instance(originalRequest);
              } catch (refreshError) {
                // Refresh token expired, logout
                localStorage.removeItem(STORAGE_KEY);
                setState({ isAuthenticated: false, isLoading: false, user: null, accessToken: null, refreshToken: null });
                window.location.href = "/login";
              }
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  // Load auth state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken && parsed.user) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: parsed.user,
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
          });
          return;
        }
      } catch { }
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, user: { id: string; email: string }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user }));
    setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken,
      refreshToken,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!state.refreshToken) return false;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: state.refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data;
      login(accessToken, newRefreshToken, state.user!);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [state.refreshToken, state.user, login, logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshTokens, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
