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
}

export interface PermitContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  widgetConfig: WidgetConfig | null;
  configError: string | null;
  login: () => void;
  logout: () => void;
}

export const PermitContext = createContext<PermitContextType | undefined>(
  undefined,
);
