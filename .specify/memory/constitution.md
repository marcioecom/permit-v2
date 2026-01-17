<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0 (MAJOR - Initial constitution ratification)

Modified principles: N/A (New constitution)

Added sections:
- Core Principles (5 principles)
  - I. Code Quality
  - II. Domain-Driven Simplicity
  - III. Testing Standards
  - IV. User Experience Consistency
  - V. Performance Requirements
- Development Practices (additional constraints section)
- Governance

Removed sections: N/A

Templates requiring updates:
- .specify/templates/plan-template.md ✅ (Constitution Check section compatible)
- .specify/templates/spec-template.md ✅ (User scenarios and requirements sections aligned)
- .specify/templates/tasks-template.md ✅ (Test-first approach compatible)

Follow-up TODOs: None
-->

# Permit Constitution

## Core Principles

### I. Code Quality

Code MUST be understandable by a solo developer without requiring tribal knowledge or complex mental models.

**Non-Negotiables**:

- **KISS**: No premature abstractions; keep code simple and direct
- **Rule of Three**: Only abstract when a pattern repeats 3+ times
- **Declarative patterns**: Use object mapping over switch/if-else chains; use array methods (map, filter, reduce) over for loops
- **Early returns**: Use guard clauses over nested conditions
- **Readability over cleverness**: Choose clear names and self-documenting code over terse or "smart" implementations
- **Dead code deletion**: Never comment out code—always remove it
- **Minimal ceremony**: Use unified DTOs, avoid verbose decorators, extract configuration to dedicated files
- **Functional composition**: Prefer optional chaining (`?.`), nullish coalescing (`??`), and spread operators for conditional object construction

**Rationale**: Simple code is maintainable code. Every abstraction has a cost; defer that cost until the benefit is proven.

### II. Domain-Driven Simplicity

Software MUST reflect business concepts clearly and be easy to maintain, extend, and reason about.

**Non-Negotiables**:

- **Clear domain boundaries**: Modules MUST have well-defined responsibilities and explicit interfaces
- **Ubiquitous language**: Code terminology MUST reflect business concepts—no translation layer between domain experts and code
- **Rich domain models**: Business logic lives in domain models, not scattered across services with anemic entities
- **Invest early**: Spend time on domain clarity now to reduce complexity later

**Rationale**: Domain complexity is inherent; technical complexity is a choice. Minimize technical complexity to focus on solving business problems.

### III. Testing Standards

Tests MUST verify behavior and provide confidence in changes, not create maintenance burdens.

**Non-Negotiables**:

- **Behavior verification**: Tests verify what the system does, not how it does it—no testing of implementation details
- **Test stratification**: Unit tests for business logic; integration tests for API contracts and external interactions
- **Descriptive names**: Test names MUST describe expected behavior in plain language (e.g., `should_reject_expired_tokens`)
- **AAA structure**: All tests follow Arrange-Act-Assert for clarity and consistency

**Rationale**: Tests that break on refactoring are a liability. Tests that describe behavior serve as living documentation.

### IV. User Experience Consistency

APIs MUST provide predictable, clear, and actionable responses.

**Non-Negotiables**:

- **Consistent response formats**: All API endpoints MUST follow a unified response structure
- **Clear error messages**: Error responses MUST be actionable with appropriate HTTP status codes
- **Predictable conventions**: Endpoint naming and parameter conventions MUST be consistent across the API surface
- **Accessible documentation**: API documentation MUST be available via dedicated endpoints when needed

**Rationale**: Developers consuming APIs are users too. Consistency reduces cognitive load and accelerates integration.

### V. Performance Requirements

Systems MUST be responsive and resource-efficient by design.

**Non-Negotiables**:

- **Fail fast**: Validate inputs at entry points before processing
- **Query efficiency**: Avoid N+1 queries and unnecessary database round-trips
- **Strategic caching**: Use appropriate caching for static or slow-changing data
- **Minimal payloads**: Response payloads MUST contain only relevant data—no over-fetching

**Rationale**: Performance is a feature. Users experience performance directly; optimize where it matters.

## Development Practices

**Code Review Gates**:

- All changes MUST be reviewed against constitution principles
- Complexity MUST be justified in PR descriptions when deviating from simplicity guidelines
- Dead code and commented-out code MUST be removed before merge

**Documentation Requirements**:

- Public APIs MUST have clear documentation
- Complex business logic MUST have inline rationale comments
- Architecture decisions MUST be recorded when they impact multiple modules

## Governance

This constitution supersedes all other development practices in case of conflict. Amendments require:

1. Written proposal documenting the change and rationale
2. Impact assessment on existing codebase
3. Migration plan if the change affects existing patterns
4. Version update following semantic versioning

**Compliance**: All PRs and code reviews MUST verify compliance with these principles. Deviations require explicit justification and approval.

**Version**: 1.0.0 | **Ratified**: 2026-01-17 | **Last Amended**: 2026-01-17
