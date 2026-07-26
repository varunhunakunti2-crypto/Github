# Architecture Design Specification — GitForge (Phase 6)

This document specifies the architectural model and service hierarchy for GitForge.

---

## 1. Architectural Overview

GitForge uses a multi-tiered, service-oriented architecture designed for separation of concerns, high scalability, and clean data flow.

```mermaid
graph TD
    Client[Next.js Client App] -->|HTTPS / WSS| Gateway[API Gateway]
    Gateway -->|Route & Proxy| Nest[NestJS API Core]
    
    subgraph Service Layer (Modular Services)
        Nest --> AuthS[Authentication Service]
        Nest --> RepoS[Repository Service]
        Nest --> GitS[Git Service]
        Nest --> SearchS[Search Service]
        Nest --> NotifS[Notification Service]
        Nest --> ActS[Actions Service]
        Nest --> OrgS[Organization Service]
        Nest --> StorS[Storage Service]
        Nest --> FileS[Files Service]
        Nest --> EmailS[Email Service]
        Nest --> SecS[Security Service]
    end
    
    subgraph Data Tier
        AuthS & RepoS & OrgS & ActS & NotifS --> Postgres[(PostgreSQL Database)]
        GitS & FileS --> GitStorage[Shared Git Storage]
        StorS --> MinIO[(MinIO Object Storage)]
        SecS & NotifS & Gateway --> Redis[(Redis Cache & Queue)]
    end
```

---

## 2. Layer Analysis

### 2.1 Next.js (Frontend / Client Interface)
* **Role**: User-facing web application built with Next.js 15 App Router, React Server Components (RSC), and Server Actions.
* **Responsibilities**:
  * **Static & Dynamic Rendering**: Render dashboard views, code view pages, and pull request timelines.
  * **Optimization**: Pre-render syntax highlighting on the server, serving lightweight HTML pages with minimal client-side JS overhead.
  * **State Management**: Manage interactive UI states (e.g., inline PR comments, markdown editing preview, tabbed navigation) locally.

### 2.2 API Gateway
* **Role**: Entry point for all external HTTP, WebSocket, and Git transport requests.
* **Responsibilities**:
  * **Reverse Proxying & Routing**: Route incoming client traffic to the appropriate NestJS backend, Git daemon, or static assets.
  * **SSL/TLS Termination**: Decrypt HTTPS traffic and enforce secure TLS 1.3.
  * **Rate Limiting**: Apply global IP-based rate limiting via Redis connection to mitigate DDoS risks.
  * **CORS & Headers**: Centralize CORS configuration and inject security headers (CSP, HSTS, X-Frame-Options).

### 2.3 NestJS (Core Controller / Orchestrator)
* **Role**: Primary backend framework that coordinates business logic, request validation, and service orchestration.
* **Responsibilities**:
  * **Routing & Middleware**: Parse and validate API requests using NestJS pipes and guards.
  * **Service Orchestration**: Instantiates and injects the modular services to process requests.
  * **Event Dispatching**: Broadcast system events internally via event emitters and externally via WebSockets (e.g., live update of PR review statuses).

### 2.4 Services (Modular Logic Layer)
A collection of decoupled services containing the core business rules of GitForge. Each service is encapsulated within its own module:
* **Authentication**: Manages users, sessions, passwords, MFA, and PATs.
* **Repository**: Handles repository metadata, permissions, fork graphs, and branch management.
* **Git**: Directs low-level Git repository reads/writes, hook coordination, and SSH access.
* **Search**: Facilitates indexed full-text searching across code, repositories, and issues.
* **Notification**: Dispatches in-app, webhook, and real-time alerts.
* **Actions**: Powers CI/CD automation pipeline run scheduling and log streaming.
* **Organization**: Handles multi-tenant organization, team hierarchies, and membership controls.
* **Storage**: Integrates with MinIO/S3 for large file storage and Git LFS assets.
* **Files**: Manages file exploration, commit tree walks, and syntax highlighting compilation.
* **Email**: Delivers account verifications, transactional alerts, and activity summaries.
* **Security**: Manages security policies, audit logging, rate limits, and permission verification.

### 2.5 Database & Data Tier
* **PostgreSQL**: The relational database containing core system state, user data, issue tracking, pull requests, and permissions mapping.
* **Redis**: In-memory data store used for caching, session management, rate-limiting counters, and BullMQ task queues.
* **MinIO / S3**: Object storage container for user avatars, attachment uploads, and raw Git LFS assets.
* **Shared Git Storage**: High-throughput file system containing raw bare Git repositories.

---

## 3. Detailed Service Definitions

### 3.1 Authentication Service
* **Key Features**: Password hashing with Argon2id, session tokens, OAuth2 (GitHub/Google login), Multi-Factor Authentication (MFA), Personal Access Token (PAT) generation.
* **Data Association**: Integrates with `users` and `sessions` tables in PostgreSQL.

### 3.2 Repository Service
* **Key Features**: Repo initialization, branch protection rules management, fork and pull request lifecycle state updates.
* **Data Association**: Interacts with `repositories`, `branches`, `branch_protection_rules`, and `pull_requests` tables.

### 3.3 Git Service
* **Key Features**: Interacts directly with bare repositories on the disk, manages Git hooks (`pre-receive`, `post-receive`), runs Git porcelain commands (`git-log`, `git-show-ref`), and coordinates the Git SSH daemon (`ssh2`).

### 3.4 Search Service
* **Key Features**: Asynchronously indexes repositories, source code files, issues, and user profiles. Uses a search engine (e.g., Elasticsearch, pg_trgm, or Meilisearch) to deliver fast autocomplete results.

### 3.5 Notification Service
* **Key Features**: Orchestrates event-driven notifications (e.g., "PR approved", "Issue assigned"). Dispatches in-app notifications, push notifications, and coordinates webhook payload deliveries via BullMQ queues.

### 3.6 Actions Service
* **Key Features**: Registers CI/CD runners, parses YAML workflow definitions, schedules job runs, streams live execution logs, and updates commit check statuses.
* **Data Association**: Interacts with `actions_runs`, `actions_jobs`, and `commit_statuses` tables.

### 3.7 Organization Service
* **Key Features**: Handles organization creation, nested team profiles, team member sync, and organization role-based access control.
* **Data Association**: Interacts with `organizations`, `organization_members`, `teams`, and `team_members`.

### 3.8 Storage Service
* **Key Features**: Generates pre-signed S3 upload/download URLs for files, serves Git LFS API actions, and manages backup archives stored in MinIO.

### 3.9 Files Service
* **Key Features**: Walks the Git tree for a specific commit/branch hash, retrieves file paths/contents, formats directories, and parses files to generate raw blobs or syntax-highlighted code.

### 3.10 Email Service
* **Key Features**: Sends transactional emails (SMTP/SES) for email verification, password reset, security changes, and notification digests.

### 3.11 Security Service
* **Key Features**: Audits permission checks (RBAC validation), registers security events, handles IP rate-limiting policies, scans commit pushes for exposed credentials/secrets, and controls CORS rules.
