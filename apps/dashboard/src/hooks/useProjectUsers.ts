"use client";

import { dashboardApi } from "@/lib/api";
import { usePermit } from "@permitdev/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface UseProjectUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useProjectUsers(projectId: string, options: UseProjectUsersOptions = {}) {
  const { token } = usePermit();
  const [page, setPage] = useState(options.page ?? 1);
  const [limit, setLimit] = useState(options.limit ?? 50);
  const [search, setSearch] = useState(options.search ?? "");

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projectUsers", projectId, page, limit, search],
    queryFn: async () => {
      if (!token) return { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } };
      if (projectId) {
        return dashboardApi.listProjectUsers(token, projectId, { page, limit, search });
      }
      return dashboardApi.listAllUsers(token, { page, limit, search });
    },
    enabled: !!token,
  });

  return {
    users: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
    isLoading,
    isFetching,
    error: error?.message ?? null,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
  };
}
