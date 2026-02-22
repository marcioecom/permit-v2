import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PermitModal } from "./components/PermitModal";
import { ShadowRootProvider } from "./components/ShadowRoot";
import {
  PermitContext,
  type User,
} from "./context/PermitContext";
import permitStyles from "./global.css?inline";
import { useStoredCredentials } from "./hooks/useStoredCredentials";
import { useTokenRefresh } from "./hooks/useTokenRefresh";
import { useWidgetConfig } from "./hooks/useWidgetConfig";
import { useValidateToken } from "./lib/auth";

interface PermitConfig {
  apiUrl?: string;
  theme?: "light" | "dark";
  /** Disable Shadow DOM isolation for styles. Useful for testing environments. */
  disableShadowDOM?: boolean;
}

interface PermitProviderProps {
  projectId: string;
  config?: PermitConfig;
  children: ReactNode;
}

const DEFAULT_API_URL = "https://api-permit.marcio.run/api/v1";

// Create a stable query client outside component to avoid recreation
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const PermitProvider = ({
  projectId,
  config = {},
  children,
}: PermitProviderProps) => {
  // Create query client once per provider instance
  const queryClient = useMemo(() => createQueryClient(), []);
  const apiUrl = config?.apiUrl || DEFAULT_API_URL;
  const disableShadowDOM = config?.disableShadowDOM ?? false;

  return (
    <QueryClientProvider client={queryClient}>
      <PermitProviderInner
        projectId={projectId}
        apiUrl={apiUrl}
        disableShadowDOM={disableShadowDOM}
      >
        {children}
      </PermitProviderInner>
    </QueryClientProvider>
  );
};

interface PermitProviderInnerProps {
  projectId: string;
  apiUrl: string;
  disableShadowDOM: boolean;
  children: ReactNode;
}

const PermitProviderInner = ({
  projectId,
  apiUrl,
  disableShadowDOM,
  children,
}: PermitProviderInnerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user, token, refreshToken, saveCredentials, updateTokens, clearCredentials } =
    useStoredCredentials(projectId);

  const { widgetConfig, configError } = useWidgetConfig({ apiUrl, projectId });

  // Validate token with backend
  const { isLoading: isValidating, isError: isTokenInvalid } = useValidateToken({
    apiUrl,
    token,
    enabled: !!token,
  });

  // Auto-refresh token before expiry
  const { doRefresh } = useTokenRefresh({
    token,
    refreshToken,
    apiUrl,
    onRefresh: updateTokens,
    onRefreshFailure: clearCredentials,
  });

  // When token validation fails, attempt refresh before logging out
  useEffect(() => {
    if (!isTokenInvalid || !token) return;

    if (refreshToken) {
      doRefresh();
    } else {
      clearCredentials();
    }
  }, [isTokenInvalid, token, refreshToken, doRefresh, clearCredentials]);

  const login = useCallback(() => {
    if (!token) setIsModalOpen(true);
  }, [token]);

  const handleLoginSuccess = useCallback(
    (accessToken: string, newRefreshToken: string, newUser: User) => {
      saveCredentials(accessToken, newRefreshToken, newUser);
      setIsModalOpen(false);
    },
    [saveCredentials],
  );

  const isLoading = token ? isValidating : false;

  return (
    <PermitContext.Provider
      value={{
        isAuthenticated: !!user && !isTokenInvalid,
        isLoading,
        user,
        token,
        login,
        logout: clearCredentials,
        accessToken: token,
        widgetConfig,
        configError,
        apiUrl,
        projectId,
      }}
    >
      {children}

      {isModalOpen && (
        <ShadowRootProvider styles={permitStyles} disabled={disableShadowDOM}>
          <PermitModal
            projectId={projectId}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleLoginSuccess}
            apiUrl={apiUrl}
            widgetConfig={widgetConfig}
          />
        </ShadowRootProvider>
      )}
    </PermitContext.Provider>
  );
};
