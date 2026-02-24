import { usePermit } from "@/hooks/usePermit";
import { oauthExchangeToken } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useEffect, useRef, useState } from "react";

interface PermitSSOCallbackProps {
  /** URL to redirect to after successful sign-in. Defaults to "/" */
  afterSignInUrl?: string;
  /** Called on successful token exchange */
  onSuccess?: (accessToken: string, refreshToken: string, user: { id: string; email: string }) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

export const PermitSSOCallback = ({
  afterSignInUrl = "/",
  onSuccess,
  onError,
}: PermitSSOCallbackProps) => {
  const { apiUrl, projectId } = usePermit();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      const errorMsg = "No authorization code found in URL";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await oauthExchangeToken(apiUrl, {
          code,
          environmentId: `env_${projectId}`,
        });

        // Store credentials using same localStorage pattern as OTP flow
        localStorage.setItem(`permit_token_${projectId}`, response.accessToken);
        localStorage.setItem(`permit_refresh_token_${projectId}`, response.refreshToken);
        localStorage.setItem(`permit_user_${projectId}`, JSON.stringify(response.user));

        onSuccess?.(response.accessToken, response.refreshToken, response.user);

        window.location.href = afterSignInUrl;
      } catch (err) {
        const apiError = err as ApiError;
        const errorMsg = apiError.message || "Authentication failed";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    exchangeCode();
  }, [apiUrl, projectId, afterSignInUrl, onSuccess, onError]);

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: "8px" }}>Authentication failed</p>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Completing sign in...</p>
      </div>
    </div>
  );
};
