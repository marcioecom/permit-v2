import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PermitModal } from "./components/PermitModal";
import { PermitContext, type User } from "./context/PermitContext";
import { useValidateToken } from "./lib/auth";

interface PermitConfig {
  apiUrl?: string;
  theme?: "light" | "dark";
}

interface PermitProviderProps {
  projectId: string;
  config?: PermitConfig;
  children: ReactNode;
}

const DEFAULT_API_URL = "http://localhost:8080/api/v1";

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
  config,
  children,
}: PermitProviderProps) => {
  // Create query client once per provider instance
  const queryClient = useMemo(() => createQueryClient(), []);
  const apiUrl = config?.apiUrl || DEFAULT_API_URL;

  return (
    <QueryClientProvider client={queryClient}>
      <PermitProviderInner projectId={projectId} apiUrl={apiUrl}>
        {children}
      </PermitProviderInner>
    </QueryClientProvider>
  );
};

interface PermitProviderInnerProps {
  projectId: string;
  apiUrl: string;
  children: ReactNode;
}

const PermitProviderInner = ({
  projectId,
  apiUrl,
  children,
}: PermitProviderInnerProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<{
    title?: string;
    subtitle?: string;
    enabledProviders?: string[];
    primaryColor?: string;
    logoUrl?: string;
  } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load stored credentials on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(`permit_token_${projectId}`);
    const storedUser = localStorage.getItem(`permit_user_${projectId}`);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, [projectId]);

  // Fetch widget config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${apiUrl}/projects/${projectId}/widget`);
        if (!response.ok) {
          if (response.status === 404) {
            setConfigError("Invalid project ID");
            return;
          }
          throw new Error("Failed to load configuration");
        }
        const data = await response.json();
        setWidgetConfig(data.data || data);
      } catch {
        setConfigError("Failed to load project configuration");
      }
    };
    fetchConfig();
  }, [apiUrl, projectId]);

  // Validate token with backend
  const { isLoading: isValidating, isError: isTokenInvalid } = useValidateToken(
    {
      apiUrl,
      token,
      enabled: !!token,
    }
  );

  // Clear invalid token
  useEffect(() => {
    if (isTokenInvalid && token) {
      localStorage.removeItem(`permit_token_${projectId}`);
      localStorage.removeItem(`permit_user_${projectId}`);
      setToken(null);
      setUser(null);
    }
  }, [isTokenInvalid, token, projectId]);

  const login = () => {
    if (!token) setIsModalOpen(true);
  };

  const logout = () => {
    localStorage.removeItem(`permit_token_${projectId}`);
    localStorage.removeItem(`permit_user_${projectId}`);
    setUser(null);
    setToken(null);
  };

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem(`permit_token_${projectId}`, newToken);
    localStorage.setItem(`permit_user_${projectId}`, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsModalOpen(false);
  };

  // Loading state: checking localStorage or validating token
  const isLoading = token ? isValidating : false;

  return (
    <PermitContext.Provider
      value={{
        isAuthenticated: !!user && !isTokenInvalid,
        isLoading,
        user,
        token,
        login,
        logout,
        widgetConfig,
        configError,
      }}
    >
      {children}

      {isModalOpen && (
        <PermitModal
          projectId={projectId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleLoginSuccess}
          apiUrl={apiUrl}
          widgetConfig={widgetConfig}
        />
      )}
    </PermitContext.Provider>
  );
};
