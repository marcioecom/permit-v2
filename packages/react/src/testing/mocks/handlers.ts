import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:8080/api/v1";

// Mock user database
const users = new Map<string, { id: string; email: string }>();
const otpCodes = new Map<string, string>(); // email -> code

export const handlers = [
  // Start OTP flow
  http.post(`${API_URL}/auth/otp/start`, async ({ request }) => {
    const body = (await request.json()) as { email: string; projectId: string };

    // Generate a mock OTP code
    const code = "123456";
    otpCodes.set(body.email, code);

    return HttpResponse.json({
      message: "Verification code sent",
    });
  }),

  // Verify OTP
  http.post(`${API_URL}/auth/otp/verify`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      code: string;
      projectId: string;
    };

    const expectedCode = otpCodes.get(body.email);

    if (!expectedCode || expectedCode !== body.code) {
      return HttpResponse.json(
        { message: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Create or get user
    let user = users.get(body.email);
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        email: body.email,
      };
      users.set(body.email, user);
    }

    // Clear OTP code
    otpCodes.delete(body.email);

    return HttpResponse.json({
      jwt: "mock_jwt_token_" + Date.now(),
      user: {
        id: user.id,
        email: user.email,
        firstName: "Test",
        lastName: "User",
        role: "USER",
        teamId: "team_123",
        bio: "",
        createdAt: Date.now(),
      },
    });
  }),

  // Get current user
  http.get(`${API_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Return a mock user
    return HttpResponse.json({
      id: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "USER",
      teamId: "team_123",
      bio: "",
      createdAt: Date.now(),
    });
  }),

  // Logout
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),

  // Widget config
  http.get(`${API_URL}/projects/:projectId/widget`, () => {
    return HttpResponse.json({
      data: {
        title: "Test Project",
        subtitle: "Please sign in",
        enabledProviders: ["email"],
        primaryColor: "#4f46e5",
        logoUrl: null,
      },
    });
  }),
];
