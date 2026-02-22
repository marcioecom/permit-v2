"use client";

import { PermitProvider } from "@permitdev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const DASHBOARD_PROJECT_ID = process.env.NEXT_PUBLIC_DASHBOARD_PROJECT_ID || "dashboard";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
// const API_URL = "http://localhost:8080/api/v1";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PermitProvider
      projectId={DASHBOARD_PROJECT_ID}
      config={{ apiUrl: API_URL }}
    >
      <QueryClientProvider client={new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      })}>
        {children}
      </QueryClientProvider>
    </PermitProvider>
  );
}
