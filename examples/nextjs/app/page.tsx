'use client';

import { usePermit } from '@permitdev/react';
import { useState } from 'react';

export default function Home() {
  const { login, logout, user, isAuthenticated, accessToken } = usePermit();
  const [protectedData, setProtectedData] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProtectedData = async () => {
    try {
      setFetchError(null);
      const token = accessToken;

      const response = await fetch('/api/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch');
      }

      const data = await response.json();
      setProtectedData(JSON.stringify(data, null, 2));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (!isAuthenticated) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.title}>Permit SDK Example</h1>
          <p style={styles.subtitle}>Click below to authenticate</p>
          <button style={styles.button} onClick={login}>
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome!</h1>
        <p style={styles.subtitle}>You are authenticated as:</p>

        <div style={styles.userInfo}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>

        <div style={styles.actions}>
          <button style={styles.button} onClick={fetchProtectedData}>
            Fetch Protected Data
          </button>
          <button style={styles.buttonSecondary} onClick={logout}>
            Logout
          </button>
        </div>

        {protectedData && (
          <div style={styles.codeBlock}>
            <h3>Protected Data Response:</h3>
            <pre>{protectedData}</pre>
          </div>
        )}

        {fetchError && (
          <div style={styles.error}>
            <p>Error: {fetchError}</p>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#1a1a2e',
  },
  subtitle: {
    color: '#666',
    marginBottom: '24px',
  },
  userInfo: {
    background: '#f5f5f5',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  button: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonSecondary: {
    background: '#e5e5e5',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  codeBlock: {
    background: '#1a1a2e',
    color: '#4ade80',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'left',
    overflow: 'auto',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'left',
  },
};
