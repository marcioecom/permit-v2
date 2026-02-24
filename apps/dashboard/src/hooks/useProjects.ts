"use client";

import { CreateProjectRequest, dashboardApi } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProjects() {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!token) return [];
      const res = await dashboardApi.listProjects(token);
      return res.data;
    },
    enabled: !!token,
  });

  const createProject = useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.createProject(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.deleteProject(token, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return {
    projects,
    isLoading,
    error: error?.message ?? null,
    refetch,
    createProject,
    deleteProject,
  };
}
