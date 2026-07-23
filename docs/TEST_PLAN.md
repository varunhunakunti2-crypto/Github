# Test Strategy & Quality Assurance Plan

## Project Name: GitForge

### Version: 1.0.0

### Date: 2026-07-23

---

## 1. Testing Objectives

This document establishes the Quality Assurance (QA) strategy for **GitForge**. The primary goals are:

- **Git Protocol Integrity**: Guarantee 100% data integrity for remote Git repository synchronization over HTTP and SSH.
- **Sub-150ms Interaction Performance**: Verify that UI transitions and page loads comply with the speed requirements defined in the SRS.
- **Secure Authentication & RBAC**: Validate password hashes, Multi-Factor Authentication, SSH key mappings, and branch write permissions.
- **Asynchronous Resilience**: Ensure webhook payloads and large file pointers (Git LFS) are correctly stored and dispatched.

---

## 2. Testing Levels & Scope

### 2.1 Unit Testing

- **Scope**: Individual utility functions, NestJS decorators, custom React hooks, Prisma helper logic, and domain services.
- **Approach**: Isolated mock testing. External dependencies (databases, Redis, MinIO) will be mocked out using Prisma Mock Client and Jest/Vitest mock adapters.
- **Frequency**: Automated on every code change (local watch modes and CI on git push).

### 2.2 Integration Testing

- **Scope**: Interaction between NestJS modules and database, API endpoint payload validation, Redis job queuing (BullMQ), and MinIO file presigning.
- **Approach**: Run test suites against a containerized Test Database (PostgreSQL) and Cache (Redis) spun up in a Docker environment.
- **Frequency**: Executed as a gating check before pulling PRs into the `main` branch.

### 2.3 End-to-End (E2E) Testing

- **Scope**: Unified user journeys. For example: User signs up -> registers SSH key -> creates repository -> creates branch -> opens PR -> reviews code -> merges PR.
- **Approach**: Browser automation (Playwright) navigating the Next.js web application, executing HTTP API actions against the NestJS backend, and verifying database results.
- **Frequency**: Run on release branches and as a nightly regression suite.

### 2.4 Load / Performance Testing

- **Scope**: Performance under concurrent SSH transactions (push/pull operations) and large query response limits.
- **Approach**: Scripted HTTP/SSH requests using K6 to simulate up to 1,000 concurrent client sessions pushing Git repositories.
- **Frequency**: Run prior to major release milestones (pre-launch).

### 2.5 Security Testing

- **Scope**: Authentication bypass checks, RBAC validation (e.g. Guest trying to push to private repos), SQL injection prevention (Prisma provides parameterized queries by default, but verify input boundaries), and SSH key permission limits.
- **Approach**: Static Application Security Testing (SAST) during build, coupled with manual penetration checks targeting Git SSH hook layers.

---

## 3. Recommended Tools & Frameworks

| Testing Tier                   | Tool / Framework                   | Justification                                                                                                                                                                   |
| :----------------------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit (Frontend/UI)**         | **Vitest + React Testing Library** | Vitest provides rapid ESM-native compilation matching Tailwind v4 modules, making React 19 unit checks extremely fast.                                                          |
| **Unit/Integration (Backend)** | **Jest + Supertest**               | NestJS provides Jest scaffolding as its default setup. Supertest allows mounting the NestJS app in-memory to test API controller routing without booting a full network server. |
| **E2E Automation**             | **Playwright**                     | Excellent multi-browser automation, robust trace recording, built-in visual comparison features, and native support for Next.js App Router applications.                        |
| **Performance Testing**        | **K6 (Grafana)**                   | Scriptable in JavaScript/TypeScript, lightweight CPU usage, and integrates easily with CI dashboards to analyze latency graphs.                                                 |
| **Static Code Analysis**       | **ESLint + Prettier**              | Enforces code formatting, syntax consistency, and potential memory leak alerts before compiling.                                                                                |

---

## 4. Test Environments

We define three logical testing environments:

```
+-------------+      +---------------+      +-------------+
|    Local    | ---> |    Staging    | ---> |  Production |
| (Developer) |      | (CI/CD / QA)  |      |   (Cloud)   |
+-------------+      +---------------+      +-------------+
```

### 4.1 Local (Developer Environment)

- **Database/Services**: Spun up locally via `docker-compose.yml` (PostgreSQL, Redis, MinIO).
- **Prisma Client**: Local dev schema migrated using `npx prisma db push`.
- **Run Scripts**: `npm run test` (watch mode for local unit checks).

### 4.2 Staging / CI (Github Actions)

- **Database/Services**: Temporary test containers instantiated on CI runners.
- **Prisma Client**: Initialized with fresh migrations using `npx prisma db push --accept-data-loss`.
- **Target IP**: In-memory routes (`localhost` mock ports).

### 4.3 Production (GitForge Cloud)

- **Database/Services**: Scaled DB cluster (managed RDS) + secure cache (Redis Enterprise) + high availability Object Storage.
- **Safety Rule**: No test scripts or test mocks are allowed to run directly on the production tier. Smoke tests are conducted using read-only test accounts.

---

## 5. Entry & Exit Criteria

### 5.1 Development / Unit Test Phase

- **Entry Criteria**:
  - Code compiles without syntax errors or linter warnings.
  - Prisma client generated successfully.
- **Exit Criteria**:
  - Unit test coverage reaches at least 80% on core business modules.
  - 100% of unit tests pass cleanly.

### 5.2 Pull Request / Integration Phase

- **Entry Criteria**:
  - A Pull Request is opened targetting `main`.
  - All unit test checks have passed.
- **Exit Criteria**:
  - Database schema migrations complete on staging database.
  - All supertest API endpoints return valid HTTP statuses.
  - 100% of branch protection rules validated.

### 5.3 Release / E2E Automation Phase

- **Entry Criteria**:
  - Integration suite passes on CI.
  - Code deployed successfully to staging instance.
- **Exit Criteria**:
  - All Playwright critical user flows (Auth, PRs, Git Transport) verify success.
  - No open Critical/High bugs in the tracking system.
  - Visual regression testing matches screenshots within a 0.5% threshold.
