# Feature Specification: Permit Embedded Authentication

**Feature Branch**: `001-embedded-auth`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Sistema de autenticação embedded (estilo Privy.io/Clerk), focado em desenvolvedores que buscam simplicidade (KISS). O sistema permite que 'Projetos' (sites clientes) integrem um widget de autenticação customizável através de um SDK React. O foco inicial é passwordless (OTP e Social Login)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Project Setup (Priority: P1)

A developer creates a new project in the Permit dashboard, configures basic authentication settings (allowed domains, branding), and receives credentials (App ID and API keys) to integrate the SDK into their application.

**Why this priority**: Without a project configured with credentials, no authentication can happen. This is the foundation for all other features.

**Independent Test**: Can be fully tested by creating a project via the dashboard and verifying that valid credentials are generated and displayed.

**Acceptance Scenarios**:

1. **Given** a developer with an account, **When** they create a new project with a name and allowed domains, **Then** the system generates an App ID and API secret keys.
2. **Given** a project exists, **When** the developer accesses the dashboard, **Then** they can view and copy their credentials.
3. **Given** a project with credentials, **When** the developer configures branding (logo, accent color), **Then** the settings are saved and will be reflected in the widget.

---

### User Story 2 - End User Email OTP Authentication (Priority: P1)

An end user visits a client site with Permit integrated, opens the authentication widget (modal), enters their email address, receives an OTP code via email, and submits it to complete authentication.

**Why this priority**: Email OTP is the core passwordless authentication method—the primary value proposition of the system.

**Independent Test**: Can be tested by integrating the SDK in a demo app, triggering authentication, and completing the OTP flow.

**Acceptance Scenarios**:

1. **Given** the widget is displayed, **When** a user enters a valid email address and submits, **Then** an OTP code is sent to that email.
2. **Given** an OTP was sent, **When** the user enters the correct code within the validity period, **Then** authentication succeeds and the user is logged in.
3. **Given** an OTP was sent, **When** the user enters an incorrect code, **Then** authentication fails with a clear error message.
4. **Given** an OTP was sent, **When** the validity period expires, **Then** the code is rejected and the user must request a new one.

---

### User Story 3 - End User Social Login (Priority: P2)

An end user visits a client site with Permit integrated, opens the authentication widget, selects a social provider (Google, GitHub), authenticates with that provider, and is redirected back to the client site as an authenticated user.

**Why this priority**: Social login is a key convenience feature that increases conversion rates by reducing friction.

**Independent Test**: Can be tested by configuring a social provider in the dashboard and completing an OAuth flow via the widget.

**Acceptance Scenarios**:

1. **Given** the project has Google configured as a provider, **When** a user clicks "Continue with Google" and completes OAuth, **Then** authentication succeeds.
2. **Given** the project has GitHub configured as a provider, **When** a user clicks "Continue with GitHub" and completes OAuth, **Then** authentication succeeds.
3. **Given** a user previously authenticated via social login, **When** they authenticate again with the same provider, **Then** the same user account is matched.

---

### User Story 4 - SDK Integration (Priority: P1)

A developer installs the Permit React SDK, initializes it with their App ID, and adds the authentication widget component to their application. End users can then trigger the widget to authenticate.

**Why this priority**: Without SDK integration, client applications cannot use the authentication system. This is essential for the embedded experience.

**Independent Test**: Can be tested by installing the SDK in a sample React app, initializing it, adding the widget, and verifying it renders correctly.

**Acceptance Scenarios**:

1. **Given** a React application, **When** the developer installs the SDK and initializes it with a valid App ID, **Then** the SDK connects successfully.
2. **Given** the SDK is initialized, **When** the developer adds the widget component, **Then** a modal can be triggered to display the authentication UI.
3. **Given** authentication succeeds in the widget, **When** the modal closes, **Then** the SDK provides access to the authenticated user's session data.

---

### User Story 5 - Session Management (Priority: P2)

After authentication, the system issues a session token that the client application can use to verify the user's identity. The developer can retrieve user information and the session status via the SDK.

**Why this priority**: Session management is required for the application to maintain and verify authenticated state after initial login.

**Independent Test**: Can be tested by authenticating a user and verifying that subsequent SDK calls return valid session and user data.

**Acceptance Scenarios**:

1. **Given** a user authenticated successfully, **When** the developer calls the SDK to get the current user, **Then** user information (email, linked accounts) is returned.
2. **Given** a valid session exists, **When** the developer checks session status, **Then** the session is marked as active.
3. **Given** a session has expired, **When** the developer checks session status, **Then** the session is marked as invalid and the user must re-authenticate.

---

### Edge Cases

- What happens when a user tries to authenticate with an email already linked to a social account?
  - The system MUST link the authentication methods to the same user account.
- What happens when the OTP service is unavailable?
  - The system MUST fail fast: display a user-friendly error immediately and allow retry. No automatic retries or fallback providers for MVP.
- What happens when a client app uses an invalid or expired App ID?
  - The SDK MUST fail gracefully with a clear error message for developers.
- What happens when a social provider returns an error?
  - The widget MUST display an appropriate error message and allow the user to try again.

## Requirements *(mandatory)*

### Functional Requirements

**Project Management**:
- **FR-001**: Developers MUST be able to create projects via a dashboard.
- **FR-001.1**: Dashboard authentication MUST use Permit's own OTP/Social authentication system (dogfooding).
- **FR-002**: Each project MUST have a unique App ID for SDK identification.
- **FR-003**: Each project MUST have API secret keys for backend verification.
- **FR-004**: Developers MUST be able to configure allowed domains for their project.
- **FR-005**: Developers MUST be able to configure basic branding (logo URL, accent color).

**Email OTP Authentication**:
- **FR-006**: System MUST send OTP codes to valid email addresses.
- **FR-007**: OTP codes MUST expire after a reasonable time period (assumed: 10 minutes).
- **FR-008**: System MUST validate OTP codes and issue sessions on success.
- **FR-009**: System MUST rate-limit OTP requests to prevent abuse.

**Social Login**:
- **FR-010**: System MUST support Google OAuth as a social provider.
- **FR-011**: System MUST support GitHub OAuth as a social provider.
- **FR-012**: Developers MUST be able to configure social provider credentials in the dashboard.

**SDK & Widget**:
- **FR-013**: SDK MUST provide a React component that renders an authentication modal.
- **FR-014**: SDK MUST initialize with an App ID and fetch project configuration.
- **FR-015**: Widget MUST display enabled authentication methods based on project configuration.
- **FR-016**: Widget MUST be customizable with the project's branding settings.
- **FR-017**: SDK MUST expose session state and user data to the host application.

**Session Management**:
- **FR-018**: System MUST issue secure session tokens after successful authentication.
- **FR-019**: Session tokens MUST be verifiable by the client backend.
- **FR-020**: Sessions MUST have configurable expiration (assumed: default 7 days).

**User Management**:
- **FR-021**: System MUST create user records upon first authentication. Users are scoped per-project (same email = different user in different projects).
- **FR-022**: System MUST link multiple authentication methods to the same user when matching criteria exist (same email).

### Key Entities

- **Project**: Represents a client application; has App ID, API keys, configuration (allowed domains, branding, enabled auth methods), and associated users.
- **User**: An authenticated end user scoped to a single project; can have multiple linked authentication methods (email, social accounts). Same email in different projects creates separate user accounts.
- **Session**: Represents an active authentication state; tied to a user and project, has expiration.
- **AuthMethod**: A linked authentication provider for a user (email, Google, GitHub).
- **OTPRequest**: A pending one-time password request; has email, code, expiration, and usage status.

## Assumptions

- OTP codes expire after 10 minutes (industry standard).
- Default session duration is 7 days (configurable per project).
- Initial social providers are Google and GitHub (most common).
- Email is the primary identifier for linking accounts.
- Rate limiting: max 5 OTP requests per email per hour.
- Widget styling inherits project branding but can be customized via CSS.

## Clarifications

### Session 2026-01-17

- Q: How do developers authenticate to access the dashboard? → A: Developers authenticate using Permit's own OTP/Social auth system (dogfooding)
- Q: Is user identity global or per-project? → A: Per-project isolation; each project has independent user pool (same email = separate users in different projects)
- Q: How should the system handle OTP delivery failures? → A: Fail fast with retry UI; show error immediately and allow user to retry (no automatic retries or fallback providers)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create a project and receive credentials in under 2 minutes.
- **SC-002**: End users can complete email OTP authentication in under 60 seconds.
- **SC-003**: SDK integration requires fewer than 10 lines of code for basic setup.
- **SC-004**: Widget loads and displays within 1 second of being triggered.
- **SC-005**: 95% of OTP emails are delivered within 30 seconds.
- **SC-006**: Social login flow completes in under 5 seconds after provider authorization.
- **SC-007**: System supports at least 1,000 concurrent authentication requests.
