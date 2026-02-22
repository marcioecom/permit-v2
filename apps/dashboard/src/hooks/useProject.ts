"use client";

import { dashboardApi, Project } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProject(projectId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!token) return null;
      const res = await dashboardApi.getProject(token, projectId);
      return res.data;
    },
    enabled: !!token && !!projectId,
  });

  const updateProject = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      if (!token) throw new Error("Not authenticated");
      // TODO: Implement updateProject in dashboardApi
      return { ...project, ...data };
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(["project", projectId], updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return {
    project,
    isLoading,
    error: error?.message ?? null,
    refetch,
    updateProject,
  };
}
