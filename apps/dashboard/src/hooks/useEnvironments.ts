"use client";

import { dashboardApi } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export function useEnvironments(projectId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const {
    data: environments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => dashboardApi.listEnvironments(token!, projectId),
    enabled: !!token && !!projectId,
  });

  const createEnvironment = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      dashboardApi.createEnvironment(token!, projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", projectId] });
    },
  });

  return {
    environments: environments ?? [],
    isLoading,
    error: error?.message ?? null,
    createEnvironment,
  };
}
