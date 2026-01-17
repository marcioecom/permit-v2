import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PermitModal } from "@/components/PermitModal";
import { ThemeProvider } from "@/components/theme-provider";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe("PermitModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email form by default", () => {
    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
  });

  it("shows social login buttons", () => {
    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
  });

  it("transitions to OTP step after submitting email", async () => {
    const user = userEvent.setup();

    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Enter email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    // Submit form
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Wait for OTP step
    await waitFor(() => {
      expect(screen.getByText(/we sent a code to/i)).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("shows verification code label in OTP step", async () => {
    const user = userEvent.setup();

    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Enter email and submit
    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Wait for OTP step
    await waitFor(() => {
      expect(screen.getByText(/verification code/i)).toBeInTheDocument();
    });
  });

  it("allows going back from OTP step", async () => {
    const user = userEvent.setup();

    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Go to OTP step
    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Wait for OTP step
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    // Go back
    await user.click(screen.getByRole("button", { name: /back/i }));

    // Should be back to email step
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  it("displays sign in button in OTP step", async () => {
    const user = userEvent.setup();

    render(
      <PermitModal
        projectId="test_project"
        apiUrl="http://localhost:8080/api/v1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    // Enter email and submit
    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Wait for OTP step
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /sign in/i })
      ).toBeInTheDocument();
    });
  });
});
