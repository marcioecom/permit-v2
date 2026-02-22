import { useCallback, useEffect, useState } from "react";
import type { User } from "../context/PermitContext";

function storageKey(projectId: string, suffix: string) {
  return `permit_${suffix}_${projectId}`;
}

export function useStoredCredentials(projectId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(storageKey(projectId, "token"));
    const storedUser = localStorage.getItem(storageKey(projectId, "user"));
    const storedRefresh = localStorage.getItem(storageKey(projectId, "refresh_token"));

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh);
    }
  }, [projectId]);

  const saveCredentials = useCallback(
    (accessToken: string, newRefreshToken: string, newUser: User) => {
      localStorage.setItem(storageKey(projectId, "token"), accessToken);
      localStorage.setItem(storageKey(projectId, "user"), JSON.stringify(newUser));
      localStorage.setItem(storageKey(projectId, "refresh_token"), newRefreshToken);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);
    },
    [projectId],
  );

  const updateTokens = useCallback(
    (accessToken: string, newRefreshToken: string) => {
      localStorage.setItem(storageKey(projectId, "token"), accessToken);
      localStorage.setItem(storageKey(projectId, "refresh_token"), newRefreshToken);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
    },
    [projectId],
  );

  const clearCredentials = useCallback(() => {
    localStorage.removeItem(storageKey(projectId, "token"));
    localStorage.removeItem(storageKey(projectId, "user"));
    localStorage.removeItem(storageKey(projectId, "refresh_token"));
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, [projectId]);

  return { user, token, refreshToken, saveCredentials, updateTokens, clearCredentials };
}
