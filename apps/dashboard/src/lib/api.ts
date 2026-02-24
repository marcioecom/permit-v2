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
  projectName?: string;
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
  environmentName?: string;
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

export interface CreateProjectRequest {
  name: string;
  description?: string;
  allowedOrigins?: string[];
  allowedProviders?: string[];
}

export interface CreateProjectResponse {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
}

export const dashboardApi = {
  // Create project (via main projects API)
  async createProject(token: string, data: CreateProjectRequest): Promise<CreateProjectResponse> {
    const res = await axios.post(
      `${API_URL}/projects`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  // Projects
  async listProjects(token: string): Promise<{ data: Project[]; meta: { total: number } }> {
    const res = await axios.get(`${API_URL}/dashboard/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async getProject(token: string, id: string): Promise<{ data: Project }> {
    const res = await axios.get(`${API_URL}/dashboard/projects/${id}`, {
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

    const res = await axios.get(`${API_URL}/dashboard/projects/${projectId}/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  // All Users (cross-project)
  async listAllUsers(
    token: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<PaginatedResponse<ProjectUser>> {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.search) params.set("search", options.search);

    const res = await axios.get(`${API_URL}/dashboard/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  // API Keys
  async listAPIKeys(token: string, projectId: string): Promise<{ data: APIKey[]; meta: { total: number } }> {
    const res = await axios.get(`${API_URL}/dashboard/projects/${projectId}/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async createAPIKey(token: string, projectId: string, name: string) {
    const res = await axios.post(
      `${API_URL}/projects/${projectId}/api-keys`,
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  async revokeAPIKey(token: string, projectId: string, keyId: string) {
    const res = await axios.delete(`${API_URL}/dashboard/projects/${projectId}/api-keys/${keyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  // Widget
  async getWidget(token: string, projectId: string): Promise<WidgetConfig | null> {
    const res = await axios.get(`${API_URL}/projects/${projectId}/widget`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async updateWidget(token: string, projectId: string, data: Partial<WidgetConfig>) {
    const res = await axios.patch(
      `${API_URL}/projects/${projectId}/widget`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  // Environments
  async listEnvironments(token: string, projectId: string): Promise<Environment[]> {
    const res = await axios.get(`${API_URL}/dashboard/projects/${projectId}/environments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async getEnvironment(token: string, projectId: string, envId: string): Promise<Environment> {
    const res = await axios.get(`${API_URL}/dashboard/projects/${projectId}/environments/${envId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async createEnvironment(token: string, projectId: string, data: { name: string; type: string }): Promise<Environment> {
    const res = await axios.post(
      `${API_URL}/dashboard/projects/${projectId}/environments`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  // OAuth Providers
  async listOAuthProviders(token: string, projectId: string, envId: string): Promise<OAuthProviderConfig[]> {
    const res = await axios.get(`${API_URL}/dashboard/projects/${projectId}/environments/${envId}/oauth-providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },

  async upsertOAuthProvider(token: string, projectId: string, envId: string, data: UpsertOAuthProviderRequest): Promise<OAuthProviderConfig> {
    const res = await axios.put(
      `${API_URL}/dashboard/projects/${projectId}/environments/${envId}/oauth-providers`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },

  async deleteOAuthProvider(token: string, projectId: string, envId: string, provider: string) {
    const res = await axios.delete(
      `${API_URL}/dashboard/projects/${projectId}/environments/${envId}/oauth-providers/${provider}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};

// Environments
export interface Environment {
  id: string;
  projectId: string;
  name: string;
  type: "development" | "staging" | "production";
  createdAt: string;
  updatedAt: string;
}

export interface OAuthProviderConfig {
  id: string;
  environmentId: string;
  provider: string;
  clientId: string;
  clientSecretMasked: string;
  enabled: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertOAuthProviderRequest {
  provider: string;
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;
}

export interface WidgetConfig {
  projectId: string;
  title: string;
  subtitle: string;
  themeConfig: {
    primaryColor?: string;
    logoUrl?: string;
    logoType?: string;
    logoIconName?: string;
    borderRadius?: string;
    darkMode?: boolean;
    showSecuredBadge?: boolean;
    entryTitle?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
  enabledProviders: string[];
  updatedAt: string;
}
