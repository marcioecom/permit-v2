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
          config={{ apiUrl: 'http://localhost:8080/api/v1' }}
        >
          {children}
        </PermitProvider>
      </body>
    </html>
  );
}
