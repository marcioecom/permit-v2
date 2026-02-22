"use client";

import { dashboardApi, WidgetConfig } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useWidget(projectId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const {
    data: widget,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["widget", projectId],
    queryFn: async () => {
      if (!token) return null;
      return dashboardApi.getWidget(token, projectId);
    },
    enabled: !!token && !!projectId,
  });

  const updateWidget = useMutation({
    mutationFn: async (data: Partial<WidgetConfig>) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.updateWidget(token, projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget", projectId] });
    },
  });

  return {
    widget,
    isLoading,
    error: error?.message ?? null,
    refetch,
    updateWidget,
  };
}
