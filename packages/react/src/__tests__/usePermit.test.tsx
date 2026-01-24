import { usePermit } from "@/hooks/usePermit";
import { PermitProvider } from "@/PermitProvider";
import { renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

describe("usePermit", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PermitProvider
      projectId="test_project"
      config={{ apiUrl: "http://localhost:8080/api/v1" }}
    >
      {children}
    </PermitProvider>
  );

  it("returns context values when used inside PermitProvider", () => {
    const { result } = renderHook(() => usePermit(), { wrapper });

    expect(result.current).toHaveProperty("isAuthenticated");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("token");
    expect(result.current).toHaveProperty("login");
    expect(result.current).toHaveProperty("logout");
  });

  it("throws error when used outside PermitProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePermit());
    }).toThrow("usePermit must be used within a PermitProvider");

    consoleSpy.mockRestore();
  });

  it("login and logout are functions", () => {
    const { result } = renderHook(() => usePermit(), { wrapper });

    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.logout).toBe("function");
  });
});
