import type { User } from "@/context/PermitContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, startOtp, verifyOtp } from "./api";

// ============================================
// Query Keys
// ============================================

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

// ============================================
// Hooks
// ============================================

interface UseStartOtpOptions {
  apiUrl: string;
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useStartOtp = ({
  apiUrl,
  projectId,
  onSuccess,
  onError,
}: UseStartOtpOptions) => {
  return useMutation({
    mutationFn: (data: { email: string }) => startOtp(apiUrl, data, projectId),
    onSuccess,
    onError,
  });
};

interface UseVerifyOtpOptions {
  apiUrl: string;
  projectId: string;
  onSuccess?: (data: { token: string; user: User }) => void;
  onError?: (error: Error) => void;
}

export const useVerifyOtp = ({
  apiUrl,
  projectId,
  onSuccess,
  onError,
}: UseVerifyOtpOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; code: string }) =>
      verifyOtp(apiUrl, data, projectId),
    onSuccess: (response) => {
      // Update user in cache
      queryClient.setQueryData(authKeys.user(), {
        id: response.user.id,
        email: response.user.email,
      });

      onSuccess?.({
        token: response.accessToken,
        user: { id: response.user.id, email: response.user.email },
      });
    },
    onError,
  });
};

interface UseValidateTokenOptions {
  apiUrl: string;
  token: string | null;
  enabled?: boolean;
}

export const useValidateToken = ({
  apiUrl,
  token,
  enabled = true,
}: UseValidateTokenOptions) => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => getUser(apiUrl, token!),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
};
