"use client";

import { usePermit } from "@permitdev/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface AuthLog {
  id: string;
  eventType: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  status: "SUCCESS" | "FAILED" | "OTP_SENT" | "EXPIRED";
  ipAddress: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface UseAuthLogsOptions {
  projectId?: string;
  eventType?: string;
  dateRange?: "24h" | "7d" | "30d" | "custom";
  page?: number;
  limit?: number;
}

export function useAuthLogs(options: UseAuthLogsOptions = {}) {
  const { token } = usePermit();
  const [page, setPage] = useState(options.page ?? 1);
  const [limit, setLimit] = useState(options.limit ?? 10);
  const [projectId, setProjectId] = useState(options.projectId ?? "");
  const [eventType, setEventType] = useState(options.eventType ?? "");
  const [dateRange, setDateRange] = useState(options.dateRange ?? "24h");

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authLogs", page, limit, projectId, eventType, dateRange],
    queryFn: async () => {
      if (!token) return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (projectId) params.set("projectId", projectId);
      if (eventType) params.set("eventType", eventType);
      if (dateRange) params.set("dateRange", dateRange);

      const res = await axios.get(`${API_URL}/dashboard/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  return {
    logs: (data?.data ?? []) as AuthLog[],
    meta: data?.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
    isLoading,
    isFetching,
    error: error?.message ?? null,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    projectId,
    setProjectId,
    eventType,
    setEventType,
    dateRange,
    setDateRange,
  };
}
