import { withPermitAuth } from '@permitdev/server/next';

export const GET = withPermitAuth(
  async (req, { user }) => {
    return Response.json({
      message: `Hello ${user.email}!`,
      user: {
        id: user.userId,
        email: user.email,
        appId: user.appId,
        provider: user.provider,
      },
      timestamp: new Date().toISOString(),
    });
  },
  {
    clientId: process.env.PERMIT_CLIENT_ID!,
    clientSecret: process.env.PERMIT_CLIENT_SECRET!,
    baseUrl: process.env.NEXT_PUBLIC_PERMIT_BASE_URL,
  }
);
