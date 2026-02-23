"use client";

import { dashboardApi, type UpsertOAuthProviderRequest } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export function useOAuthProviders(projectId: string, envId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const {
    data: providers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["oauth-providers", projectId, envId],
    queryFn: () => dashboardApi.listOAuthProviders(token!, projectId, envId),
    enabled: !!token && !!projectId && !!envId,
  });

  const upsertProvider = useMutation({
    mutationFn: (data: UpsertOAuthProviderRequest) =>
      dashboardApi.upsertOAuthProvider(token!, projectId, envId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oauth-providers", projectId, envId] });
    },
  });

  const deleteProvider = useMutation({
    mutationFn: (provider: string) =>
      dashboardApi.deleteOAuthProvider(token!, projectId, envId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oauth-providers", projectId, envId] });
    },
  });

  return {
    providers: providers ?? [],
    isLoading,
    error: error?.message ?? null,
    upsertProvider,
    deleteProvider,
  };
}
