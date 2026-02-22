import { PermitModal } from "@/components/PermitModal";
import { renderWithPermit, screen, waitFor } from "@/testing/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("PermitModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email form by default", () => {
    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
  });

  it("shows social login buttons", async () => {
    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    });
  });

  it("transitions to OTP step after submitting email", async () => {
    const user = userEvent.setup();

    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
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

    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
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

    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
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

    renderWithPermit(
      <PermitModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
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

  it("uses apiUrl from context when not provided as prop", () => {
    // This test verifies the core fix - PermitModal gets apiUrl from context
    renderWithPermit(<PermitModal />);

    // If we get here without error, the modal successfully got apiUrl/projectId from context
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });
});
