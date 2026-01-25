"use client";

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Dashboard API endpoints
export interface Project {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUser {
  id: string;
  email: string;
  name?: string;
  authMethod?: string;
  loginCount: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface APIKey {
  id: string;
  name: string;
  clientId: string;
  clientSecretMasked: string;
  status: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const dashboardApi = {
  // Projects
  async listProjects(token: string): Promise<{ data: Project[]; meta: { total: number } }> {
    const res = await axios.get(`${API_URL}/api/v1/dashboard/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async getProject(token: string, id: string): Promise<{ data: Project }> {
    const res = await axios.get(`${API_URL}/api/v1/dashboard/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  // Users
  async listProjectUsers(
    token: string,
    projectId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<PaginatedResponse<ProjectUser>> {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.search) params.set("search", options.search);

    const res = await axios.get(`${API_URL}/api/v1/dashboard/projects/${projectId}/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  // API Keys
  async listAPIKeys(token: string, projectId: string): Promise<{ data: APIKey[]; meta: { total: number } }> {
    const res = await axios.get(`${API_URL}/api/v1/dashboard/projects/${projectId}/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async createAPIKey(token: string, projectId: string, name: string) {
    const res = await axios.post(
      `${API_URL}/api/v1/projects/${projectId}/api-keys`,
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  async revokeAPIKey(token: string, projectId: string, keyId: string) {
    const res = await axios.delete(`${API_URL}/api/v1/dashboard/projects/${projectId}/api-keys/${keyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },
};
