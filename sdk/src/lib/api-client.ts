import Axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

function createAuthRequestInterceptor(token?: string) {
  return (config: InternalAxiosRequestConfig) => {
    if (config.headers) {
      config.headers.Accept = "application/json";
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.withCredentials = true;
    return config;
  };
}

function responseErrorInterceptor(error: AxiosError<{ message?: string }>) {
  const apiError: ApiError = {
    message: error.response?.data?.message || error.message || "Unknown error",
    status: error.response?.status,
    code: error.code,
  };

  return Promise.reject(apiError);
}

/**
 * Creates an Axios instance configured for the Permit API
 * @param baseURL - The API base URL
 * @param token - Optional JWT token for authenticated requests
 */
export const createApiClient = (baseURL: string, token?: string) => {
  const instance = Axios.create({ baseURL });

  instance.interceptors.request.use(createAuthRequestInterceptor(token));
  instance.interceptors.response.use(
    (response) => {
      // API returns { data: ..., error: ... }
      // Extract the nested data for convenience
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      }
      return response.data;
    },
    responseErrorInterceptor
  );

  return instance;
};
