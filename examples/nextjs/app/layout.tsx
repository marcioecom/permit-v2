"use client";

import { PermitProvider } from "@permitdev/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PermitProvider
          projectId="01KJ0A0G5WN4F396TATZVGMP67"
          config={{ apiUrl: 'http://localhost:8080/api/v1' }}
        >
          {children}
        </PermitProvider>
      </body>
    </html>
  );
}
