import { useState, useEffect, type ReactNode } from "react";
import { PermitContext, type User } from "./context/PermitContext";
import { PermitModal } from "./components/PermitModal";
import { TwindWrapper } from "./components/TwindWrapper";

interface PermitConfig {
  apiUrl?: string;
  theme?: "light" | "dark";
}

interface PermitProviderProps {
  projectId: string;
  config?: PermitConfig;
  children: ReactNode;
}

export const PermitProvider = ({
  projectId,
  config,
  children,
}: PermitProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(`permit_token_${projectId}`);
    const storedUser = localStorage.getItem(`permit_user_${projectId}`);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // TODO: Validar token com o backend (/auth/me) aqui
    }

    setIsLoading(false);
  }, [projectId]);

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

  return (
    <TwindWrapper>
      <PermitContext.Provider
        value={{
          isAuthenticated: !!user,
          isLoading,
          user,
          token,
          login,
          logout,
        }}
      >
        {children}

        {isModalOpen && (
          <PermitModal
            projectId={projectId}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleLoginSuccess}
            apiUrl={config?.apiUrl || "http://localhost:8080/api/v1"}
          />
        )}
      </PermitContext.Provider>
    </TwindWrapper>
  );
};
