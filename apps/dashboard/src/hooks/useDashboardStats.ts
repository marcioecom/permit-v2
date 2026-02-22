"use client";

import { usePermit } from "@permitdev/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface DashboardStats {
  activeProjects: number;
  projectsChange: string;
  monthlyUsers: number;
  usersChange: string;
  apiRequests: string;
  authSuccessRate: string;
}

export function useDashboardStats() {
  const { token } = usePermit();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async (): Promise<DashboardStats> => {
      if (!token) {
        return {
          activeProjects: 0,
          projectsChange: "+0",
          monthlyUsers: 0,
          usersChange: "+0%",
          apiRequests: "0",
          authSuccessRate: "0%",
        };
      }

      const res = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  return {
    stats,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
