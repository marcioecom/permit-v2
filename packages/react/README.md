# @permit/react

React SDK for Permit Embedded Authentication.

## Installation

```bash
npm install @permit/react
# or
pnpm add @permit/react
```

## Quick Start

### 1. Wrap your app with PermitProvider

```tsx
import { PermitProvider } from '@permit/react';

function App() {
  return (
    <PermitProvider
      projectId="your-project-id"
      config={{ apiUrl: 'https://your-api.com/api/v1' }}
    >
      <YourApp />
    </PermitProvider>
  );
}
```

### 2. Use the usePermit hook

```tsx
import { usePermit } from '@permit/react';

function Profile() {
  const { isAuthenticated, user, login, logout, isLoading } = usePermit();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Use the PermitButton component

```tsx
import { PermitButton } from '@permit/react';

function Header() {
  return <PermitButton />;
}
```

## API Reference

### PermitProvider

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | Your Permit project ID |
| `config.apiUrl` | `string` | No | API base URL (default: `http://localhost:8080/api/v1`) |
| `config.theme` | `'light' \| 'dark'` | No | Theme mode |

### usePermit Hook

Returns:

| Property | Type | Description |
|----------|------|-------------|
| `isAuthenticated` | `boolean` | Whether user is logged in |
| `isLoading` | `boolean` | Loading state |
| `user` | `{ id: string, email: string } \| null` | Current user |
| `token` | `string \| null` | Access token |
| `login` | `() => void` | Opens login modal |
| `logout` | `() => void` | Logs out user |
| `widgetConfig` | `object \| null` | Project widget configuration |
| `configError` | `string \| null` | Configuration error message |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

## License

MIT
