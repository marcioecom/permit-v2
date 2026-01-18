import { AuthResponse, User } from "@/types/api";
import { z } from "zod";
import { createApiClient } from "./api-client";

// ============================================
// OTP Authentication (Primary flow for SDK)
// ============================================

export const otpStartSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type OtpStartInput = z.infer<typeof otpStartSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const startOtp = (
  apiUrl: string,
  data: OtpStartInput,
  projectId: string
): Promise<{ message: string }> => {
  const api = createApiClient(apiUrl);
  return api.post("/auth/otp/start", { ...data, projectId });
};

export const verifyOtp = (
  apiUrl: string,
  data: OtpVerifyInput,
  projectId: string
): Promise<AuthResponse> => {
  const api = createApiClient(apiUrl);
  return api.post("/auth/otp/verify", { ...data, projectId });
};

// ============================================
// User & Session
// ============================================

export const getUser = (apiUrl: string, token: string): Promise<User> => {
  const api = createApiClient(apiUrl, token);
  return api.get("/auth/me");
};

export const logout = (apiUrl: string, token: string): Promise<void> => {
  const api = createApiClient(apiUrl, token);
  return api.post("/auth/logout");
};

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const refreshToken = (
  apiUrl: string,
  refreshTokenValue: string
): Promise<RefreshTokenResponse> => {
  const api = createApiClient(apiUrl);
  return api.post("/auth/refresh", { refreshToken: refreshTokenValue });
};
