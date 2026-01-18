import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithPermit, screen, waitFor } from "@/testing/test-utils";
import { usePermit } from "@/hooks/usePermit";

// Test component to access context
const TestConsumer = () => {
  const { isAuthenticated, isLoading, user, login, logout } = usePermit();

  return (
    <div>
      <span data-testid="loading">{isLoading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("PermitProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders children correctly", () => {
    renderWithPermit(<div data-testid="child">Hello</div>);

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("provides default context values when not authenticated", async () => {
    renderWithPermit(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
  });

  it("restores user from localStorage on mount", async () => {
    const projectId = "test_project";
    const mockUser = { id: "user_123", email: "test@example.com" };
    const mockToken = "mock_token";

    // Set up localStorage
    localStorage.setItem(`permit_token_${projectId}`, mockToken);
    localStorage.setItem(`permit_user_${projectId}`, JSON.stringify(mockUser));

    renderWithPermit(<TestConsumer />, { projectId });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
  });

  it("clears user on logout", async () => {
    const projectId = "test_project";
    const mockUser = { id: "user_123", email: "test@example.com" };
    const mockToken = "mock_token";

    localStorage.setItem(`permit_token_${projectId}`, mockToken);
    localStorage.setItem(`permit_user_${projectId}`, JSON.stringify(mockUser));

    renderWithPermit(<TestConsumer />, { projectId });

    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });

    // Click logout
    screen.getByRole("button", { name: /logout/i }).click();

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });

    // Verify localStorage is cleared
    expect(localStorage.getItem(`permit_token_${projectId}`)).toBeNull();
    expect(localStorage.getItem(`permit_user_${projectId}`)).toBeNull();
  });

  it("opens login modal when login is called", async () => {
    renderWithPermit(<TestConsumer />);

    // Click login button
    screen.getByRole("button", { name: /login/i }).click();

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
