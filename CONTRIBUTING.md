# Contributing to Permit

Thank you for your interest in contributing to Permit.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Go 1.21+ (for API development)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/marcioecom/permit-v2
cd permit-v2

# Install dependencies
pnpm install

# Start development
pnpm dev:sdk        # Watch mode for SDK packages
pnpm test:sdk       # Run SDK tests
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation if needed

### 3. Create a Changeset

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

```bash
# Create a changeset describing your changes
pnpm changeset
```

When prompted:
- Select the packages you modified
- Choose the appropriate version bump (patch, minor, major)
- Write a short description of your changes

### 4. Run Tests

```bash
# SDK tests
pnpm test:sdk

# API tests (Go)
cd api && go test ./...
```

### 5. Submit a Pull Request

- Push your branch
- Open a PR against `main`
- Fill out the PR template
- Wait for CI checks to pass
- Request review

## Release Process

Releases are automated via GitHub Actions:

1. PRs with changesets are merged to `main`
2. A "Version Packages" PR is automatically created
3. Merging the version PR triggers publishing to npm

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names

### Go

- Follow standard Go conventions
- Use `gofmt` for formatting
- Add tests for new functions

## Testing

### SDK Tests

```bash
pnpm test:sdk           # Run all SDK tests
pnpm --filter @permitdev/react test    # Run React SDK tests only
pnpm --filter @permitdev/server test   # Run Server SDK tests only
```

### API Tests

```bash
cd api
go test ./...           # Run all tests
go test ./internal/...  # Run internal package tests
```

## Project Structure

```
packages/
├── react/          # @permitdev/react - Client SDK
└── server/         # @permitdev/server - Server SDK

api/                # Go backend
├── cmd/server/     # Main entry point
└── internal/       # Internal packages

examples/
└── nextjs/         # Example application
```

## Questions?

Open an issue if you have questions or need help.
