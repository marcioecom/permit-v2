import { useCallback, useEffect, useRef } from "react";
import { refreshToken as refreshTokenApi } from "../lib/api";

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

const REFRESH_MARGIN_SECONDS = 60;

interface UseTokenRefreshOptions {
  token: string | null;
  refreshToken: string | null;
  apiUrl: string;
  onRefresh: (accessToken: string, refreshToken: string) => void;
  onRefreshFailure: () => void;
}

/**
 * Schedules proactive token refresh before the access token expires.
 * Uses a single timer to avoid duplicate refresh calls.
 */
export function useTokenRefresh({
  token,
  refreshToken,
  apiUrl,
  onRefresh,
  onRefreshFailure,
}: UseTokenRefreshOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  // Use refs for callbacks to avoid re-triggering the effect when they change
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onRefreshFailureRef = useRef(onRefreshFailure);
  onRefreshFailureRef.current = onRefreshFailure;

  // Stable ref for refresh token to use inside the timeout callback
  // without re-scheduling the timer when it rotates
  const refreshTokenRef = useRef(refreshToken);
  refreshTokenRef.current = refreshToken;

  const doRefresh = useCallback(async () => {
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    try {
      const response = await refreshTokenApi(apiUrl, currentRefreshToken);
      onRefreshRef.current(response.accessToken, response.refreshToken);
    } catch {
      onRefreshFailureRef.current();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [apiUrl]);

  // Schedule refresh based on access token expiry.
  // Only depends on `token` - when the access token changes (after refresh or login),
  // we re-schedule based on the new token's expiry.
  useEffect(() => {
    if (!token || !refreshTokenRef.current) return;

    const exp = getTokenExpiry(token);
    if (!exp) return;

    const refreshAt = (exp - REFRESH_MARGIN_SECONDS) * 1000 - Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (refreshAt <= 0) {
      doRefresh();
    } else {
      timeoutRef.current = setTimeout(doRefresh, refreshAt);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [token, doRefresh]);

  return { doRefresh };
}
