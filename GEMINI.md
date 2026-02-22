# permit-v2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-17

## Active Technologies
- TypeScript 5.x (SDK), Go 1.24 (API) + React 18, jose (JWT), vitest, changesets (002-sdk-npm-deploy)
- N/A (SDK is stateless) (002-sdk-npm-deploy)
- Go 1.24 (API), TypeScript 5.x (Dashboard, SDK) + chi v5, pgx v5, zerolog (API) | Next.js, React 18, TailwindCSS, axios, react-query (Dashboard) (003-developer-dashboard)
- PostgreSQL (existing) (003-developer-dashboard)

- Go 1.24, TypeScript 5.x + chi v5 (router), pgx v5 (database), resend-go (email), React 18, TailwindCSS (001-embedded-auth)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

Go 1.24, TypeScript 5.x: Follow standard conventions

## Recent Changes
- 003-developer-dashboard: Added Go 1.24 (API), TypeScript 5.x (Dashboard, SDK) + chi v5, pgx v5, zerolog (API) | Next.js, React 18, TailwindCSS, axios, react-query (Dashboard)
- 002-sdk-npm-deploy: Added TypeScript 5.x (SDK), Go 1.24 (API) + React 18, jose (JWT), vitest, changesets

- 001-embedded-auth: Added Go 1.24, TypeScript 5.x + chi v5 (router), pgx v5 (database), resend-go (email), React 18, TailwindCSS

<!-- MANUAL ADDITIONS START -->

## Patterns

- **Config access**: All env vars go in `config/config.go` Config struct. Access via `cfg.X`, never raw `os.Getenv`.
- **Anti-bloat comments**: STRICTLY MINIMAL. No trivial comments. Only comment complex logic or non-obvious "why".
- **Dead code removal**: If a return value is always empty/unused, change the signature to not return it.
- **Use the logger**: Use zerolog `log.Warn().Err(err).Msg()` instead of leaving TODO comments.
- **Struct validation**: Use `go-playground/validator` tags (`validate:"required,email"`) on request DTOs. Unmarshal + validate in one step, not manual code.

<!-- MANUAL ADDITIONS END -->
