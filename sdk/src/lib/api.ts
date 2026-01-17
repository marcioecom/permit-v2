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

// ============================================
// Legacy Email/Password (kept for reference)
// ============================================

export const loginInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(5, "Required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z
  .object({
    email: z.string().min(1, "Required"),
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    password: z.string().min(5, "Required"),
  })
  .and(
    z
      .object({
        teamId: z.string().min(1, "Required"),
        teamName: z.null().default(null),
      })
      .or(
        z.object({
          teamName: z.string().min(1, "Required"),
          teamId: z.null().default(null),
        })
      )
  );

export type RegisterInput = z.infer<typeof registerInputSchema>;
