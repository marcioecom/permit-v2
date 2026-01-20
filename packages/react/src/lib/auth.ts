import { useQuery } from "@tanstack/react-query";
import { getUser } from "./api";

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
