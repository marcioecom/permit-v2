"use client";

import { usePermit } from "@permitdev/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface UserStats {
  totalUsers: number;
  activeIn24h: number;
  verificationRate: string;
  blockedUsers: number;
}

export function useUserStats() {
  const { token } = usePermit();

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userStats"],
    queryFn: async (): Promise<UserStats> => {
      if (!token) {
        return { totalUsers: 0, activeIn24h: 0, verificationRate: "N/A", blockedUsers: 0 };
      }
      const res = await axios.get(`${API_URL}/dashboard/users/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  return { stats, isLoading, error: error?.message ?? null };
}
