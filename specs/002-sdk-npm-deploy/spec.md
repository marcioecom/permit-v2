# Feature Specification: SDK Full Stack - Client, Server & NPM Deploy

**Feature Branch**: `002-sdk-npm-deploy`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Organizar a pasta SDK para suportar tanto a lib client side quanto server side. Criar github actions de deploy no NPM de ambas. Criar SDK server. Criar um exemplo de uso com Next.js. Adicionar mais tests automatizados no backend e SDK."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Integrates Server SDK (Priority: P1)

A developer building their own backend needs to verify that authentication tokens issued by Permit are valid and extract user information from them. They install the Permit server SDK and configure it with their app's credentials to validate JWTs on incoming requests.

**Why this priority**: Without server-side token validation, the entire authentication flow is incomplete. Developers cannot securely use Permit's authentication in their applications.

**Independent Test**: Can be fully tested by creating a mock backend that validates a JWT token and returns user data. Delivers the core value of secure token verification.

**Acceptance Scenarios**:

1. **Given** a developer has installed the Permit server SDK, **When** they configure it with their app ID, **Then** they can validate JWT tokens issued by Permit
2. **Given** a valid JWT token, **When** the server SDK verifies it, **Then** it returns the user's identity information (user ID, email, etc.)
3. **Given** an invalid or expired JWT token, **When** the server SDK verifies it, **Then** it returns a clear error indicating the validation failure reason
4. **Given** a token signed by a different issuer, **When** the server SDK verifies it, **Then** it rejects the token with an appropriate error

---

### User Story 2 - SDK Published on NPM (Priority: P1)

A developer wants to install the Permit SDKs (client and server) via npm/pnpm/yarn to use in their project. The packages are available on the npm registry under a consistent organization namespace.

**Why this priority**: Without npm publishing, developers cannot easily integrate the SDKs into their projects. This is fundamental to distribution and adoption.

**Independent Test**: Can be tested by publishing to npm and installing the packages in a fresh project. Delivers the ability to use the SDK in any project.

**Acceptance Scenarios**:

1. **Given** a developer searches for Permit authentication on npm, **When** they find the packages, **Then** both client and server SDKs are available under a consistent naming convention
2. **Given** a developer runs `npm install @{org}/react`, **When** the installation completes, **Then** the client SDK is available for use in their React application
3. **Given** a developer runs `npm install @{org}/server`, **When** the installation completes, **Then** the server SDK is available for use in their backend
4. **Given** a new version is tagged in the repository, **When** the CI/CD pipeline runs, **Then** the packages are automatically published to npm

---

### User Story 3 - Developer Uses Example App as Reference (Priority: P2)

A developer new to Permit wants to understand how to integrate both client and server SDKs. They reference a complete example application that demonstrates the full authentication flow from login to token validation.

**Why this priority**: Examples reduce friction for new developers and showcase best practices. However, the SDKs must work first before an example is meaningful.

**Independent Test**: Can be tested by running the example application locally and completing a full login flow. Demonstrates the complete integration pattern.

**Acceptance Scenarios**:

1. **Given** a developer clones the example repository, **When** they follow the setup instructions, **Then** they can run the example locally
2. **Given** the example is running, **When** a user completes OTP authentication, **Then** the server validates the token and returns protected data
3. **Given** a developer reviews the example code, **When** they examine client and server integration, **Then** the patterns are clear and well-documented

---

### User Story 4 - Automated Tests Ensure Quality (Priority: P2)

The development team needs confidence that changes to the SDK or backend don't break the authentication flow. Automated tests cover critical paths including OTP flow, token generation, and token validation.

**Why this priority**: Tests prevent regressions and ensure quality. Critical for maintaining trust with developers using the SDK.

**Independent Test**: Can be tested by running the test suite and verifying all tests pass. CI pipeline fails on test failures.

**Acceptance Scenarios**:

1. **Given** a developer makes changes to the SDK, **When** they run the test suite, **Then** tests validate the authentication flow works correctly
2. **Given** the CI pipeline runs on a pull request, **When** any test fails, **Then** the pipeline blocks the merge
3. **Given** the OTP authentication flow, **When** tests cover the happy path and error cases, **Then** confidence in the flow is established

---

- What happens when the JWT public key rotates? (24h cache with background refresh ensures seamless rotation)
- How does the server SDK handle network failures when fetching JWKS? (Use cached keys, retry with exponential backoff)
- What happens when a developer provides invalid configuration? (Clear error messages)
- How does the system handle token refresh race conditions? (Token refresh should be atomic)

## Clarifications

### Session 2026-01-18

- Q: How long should the server SDK cache JWKS keys? → A: 24 hours cache with background refresh
- Q: What claims should be available from validated tokens? → A: user_id, email, app_id, custom metadata

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a server-side SDK for validating JWT tokens issued by the Permit backend
- **FR-002**: System MUST expose user identity information (user_id, email, app_id, custom metadata) from validated tokens
- **FR-003**: System MUST clearly indicate validation errors (expired, invalid signature, wrong issuer)
- **FR-004**: System MUST organize SDK codebase to support multiple packages (client, server)
- **FR-005**: System MUST automate npm publishing via CI/CD when new versions are released
- **FR-006**: System MUST provide a working example application demonstrating full authentication flow
- **FR-007**: System MUST have automated tests covering OTP flow, token generation, and validation
- **FR-008**: System MUST publish packages under the `@permitdev` npm organization namespace

### Key Entities

- **JWT Token**: Access token containing user identity claims, signed by Permit backend
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **User Identity**: User information extracted from validated tokens (user_id, email, app_id, custom metadata)
- **App Configuration**: Developer's app credentials for SDK initialization

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can install both client and server SDKs from npm in under 1 minute
- **SC-002**: Token validation completes in under 50 milliseconds for cached keys
- **SC-003**: Example application can be running locally in under 5 minutes following documentation
- **SC-004**: Test suite achieves 80% code coverage on critical authentication paths
- **SC-005**: Zero manual steps required for npm publishing after version tag

## Assumptions

- The npm organization namespace is `@permitdev` (packages: `@permitdev/react`, `@permitdev/server`)
- The server SDK will initially support JavaScript/TypeScript backends only
- JWKS (JSON Web Key Set) endpoint is already exposed by the Permit backend for key verification
- The existing client SDK structure will be preserved; only reorganization is needed
