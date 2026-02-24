import { createContext } from "react";

export interface User {
  id: string;
  email: string;
}

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  enabledProviders?: string[];
  primaryColor?: string;
  logoUrl?: string;
  showSecuredBadge?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  defaultEnvironmentId?: string;
}

export interface PermitContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  widgetConfig: WidgetConfig | null;
  configError: string | null;
  apiUrl: string;
  projectId: string;
  ssoCallbackUrl: string;
  login: () => void;
  logout: () => void;
  accessToken: string | null;
}

export const PermitContext = createContext<PermitContextType | undefined>(
  undefined,
);
