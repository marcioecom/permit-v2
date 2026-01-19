'use client';

import { PermitProvider } from '@permitdev/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PermitProvider
          projectId='01KF75AT7NRTTAGP96NXDQA4DG'
          // clientId={process.env.NEXT_PUBLIC_PERMIT_CLIENT_ID || 'pk_demo'}
          // baseUrl={process.env.NEXT_PUBLIC_PERMIT_BASE_URL || 'http://localhost:8080'}
        >
          {children}
        </PermitProvider>
      </body>
    </html>
  );
}
