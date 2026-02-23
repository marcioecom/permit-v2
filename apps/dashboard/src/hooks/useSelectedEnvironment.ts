"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useEnvironments } from "./useEnvironments";

const ENV_COLORS: Record<string, string> = {
  development: "#6b7280",
  staging: "#f59e0b",
  production: "#10b981",
};

export interface SelectedEnvironment {
  id: string;
  name: string;
  type: string;
  color: string;
}

function toSelectedEnvironment(env: { id: string; name: string; type: string }): SelectedEnvironment {
  return { ...env, color: ENV_COLORS[env.type] || "#6b7280" };
}

export function useSelectedEnvironment(projectId: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { environments: rawEnvironments } = useEnvironments(projectId);

  const environments = useMemo(
    () => rawEnvironments.map(toSelectedEnvironment),
    [rawEnvironments]
  );

  const defaultEnvId = environments.find((e) => e.type === "development")?.id || environments[0]?.id || "";
  const envId = searchParams.get("env") || defaultEnvId;

  const environment = useMemo(
    () => environments.find((e) => e.id === envId) || environments[0] || null,
    [environments, envId]
  );

  const setEnvironment = useCallback(
    (newEnvId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("env", newEnvId);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return {
    envId,
    environment,
    environments,
    setEnvironment,
  };
}

// "use client";

// import { useSearchParams, useRouter, usePathname } from "next/navigation";
// import { useCallback, useMemo } from "react";

// export interface Environment {
//   id: string;
//   name: string;
//   type: "development" | "staging" | "production";
//   color: string;
// }

// const ENVIRONMENTS: Environment[] = [
//   { id: "dev", name: "Development", type: "development", color: "#6b7280" },
//   { id: "staging", name: "Staging", type: "staging", color: "#f59e0b" },
//   { id: "prod", name: "Production", type: "production", color: "#10b981" },
// ];

// const DEFAULT_ENV_ID = "dev";

// export function useSelectedEnvironment() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const pathname = usePathname();

//   const envId = searchParams.get("env") || DEFAULT_ENV_ID;

//   const environment = useMemo(
//     () => ENVIRONMENTS.find((e) => e.id === envId) || ENVIRONMENTS[0],
//     [envId]
//   );

//   const setEnvironment = useCallback(
//     (newEnvId: string) => {
//       const params = new URLSearchParams(searchParams.toString());
//       params.set("env", newEnvId);
//       router.push(`${pathname}?${params.toString()}`);
//     },
//     [searchParams, router, pathname]
//   );

//   return {
//     envId,
//     environment,
//     environments: ENVIRONMENTS,
//     setEnvironment,
//   };
// }
