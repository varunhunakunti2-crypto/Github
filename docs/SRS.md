# Software Requirements Specification (SRS)

## Project Name: GitForge

### Version: 1.0.0-draft

### Date: 2026-07-22

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) documents the functional and non-functional requirements for **GitForge**, a production-ready Git repository hosting and developer collaboration platform. GitForge is built to provide developers with a fast, high-performance web dashboard inspired by Vercel's clean aesthetic, combined with robust, enterprise-grade Git hosting, issue tracking, and code review capabilities.

### 1.2 Scope

GitForge will allow developers to:

- Authenticate securely using passwords, Multi-Factor Authentication (MFA), and SSH keys.
- Host Git repositories with full remote capabilities over HTTPS and SSH protocols.
- Explore repository directories, view commit histories, and examine source code with syntax highlighting on the web.
- Manage development workflows using Pull Requests with a line-by-line code review, comment system, and branch merging.
- Manage tasks, bugs, and milestones via an integrated Issue Tracker.
- Integrate external automation via repository Webhooks.
- Store large binary assets using Git LFS (Large File Storage) backed by a self-hosted S3-compatible storage cluster (MinIO).

### 1.3 Definitions, Acronyms, and Abbreviations

- **PR**: Pull Request
- **PAT**: Personal Access Token
- **LFS**: Large File Storage
- **SSH**: Secure Shell
- **RBAC**: Role-Based Access Control
- **RSC**: React Server Components
- **API**: Application Programming Interface
- **CGI**: Common Gateway Interface

---

## 2. Objectives

### 2.1 Business Goals

- **Productivity Acceleration**: Empower engineering teams with instant code visualizers, fast repository browsing, and lightning-fast code review cycles.
- **Visual Distinction**: Establish a premium developer brand that appeals directly to front-end and full-stack engineers by adhering to a stark, high-fidelity dark-and-light canvas theme.
- **Enterprise Ready**: Build from the ground up with high security, auditing, data isolation, and performant horizontal scaling.

### 2.2 User Needs

- **High Performance**: Sub-second page routing and code diff load times.
- **Intuitive Pull Requests**: Code review flows that make inline commenting, multi-line selections, and visual threads painless.
- **Frictionless Git Integration**: Easy local repo setup, secure SSH key registration, and rapid HTTPS cloning.

---

## 3. Functional Requirements

### 3.1 User Authentication & Profile Management

- **FR-1.1 (Register & Login)**: Users shall be able to register accounts and log in securely.
- **FR-1.2 (Social Auth)**: Users should be able to authenticate via third-party providers (e.g., GitHub, GitLab, Google).
- **FR-1.3 (SSH Key Management)**: Users shall be able to add, view, and delete SSH public keys for remote Git operations.
- **FR-1.4 (Personal Access Tokens)**: Users shall be able to generate scoped PATs to authenticate Git actions over HTTPS.
- **FR-1.5 (Profile Dashboard)**: Users shall have a profile showing their public contributions, active repositories, and organizations.

### 3.2 Git Repository Management

- **FR-2.1 (Create & Delete Repositories)**: Users shall be able to create new public or private repositories, specifying name, description, and initialization options (README, gitignore).
- **FR-2.2 (HTTP/SSH Server)**: The system shall support Git standard clone, push, and pull commands via:
  - SSH protocol (port 22 or 2222) authenticated by user SSH keys.
  - HTTPS protocol (port 443) authenticated by user credentials or PATs.
- **FR-2.3 (Web Code Explorer)**: The web UI shall show a file explorer tree, files viewer with syntax highlighting, last commit message per file, and repository README preview.
- **FR-2.4 (Branch & Tag Management)**: Users shall be able to create, delete, and switch branches and tags in the web UI.
- **FR-2.5 (Commit Log)**: The web UI shall display a history of commits on any branch with detailed commit messages, author metadata, and links to visual diffs.

### 3.3 Collaboration & Pull Requests

- **FR-3.1 (PR Creation)**: Users shall be able to open a Pull Request comparing two branches (base and compare) within a repo or across forks.
- **FR-3.2 (PR Diff Viewer)**: The PR viewer shall display side-by-side or unified file diffs showing added, modified, and deleted lines.
- **FR-3.3 (Line-Level Review)**: Users shall be able to leave comments on specific lines of code in the PR diff.
- **FR-3.4 (PR Discussion Threads)**: Comments on code lines shall support multi-user reply threads, markdown, and "Resolve Conversation" buttons.
- **FR-3.5 (Merging Strategies)**: Repositories shall support Squash-and-Merge, Rebase-and-Merge, and Standard Merge Commit strategies.
- **FR-3.6 (Branch Protection)**: Repository admins shall be able to lock branches, requiring PR approval and status check completions before merging.

### 3.4 Issue Tracking

- **FR-4.1 (Issue Lifecycle)**: Users shall be able to create, read, edit, close, and delete Issues.
- **FR-4.2 (Labels & Milestones)**: Issues shall support assignment to users, custom color-coded labels, and linking to project milestones.
- **FR-4.3 (Comments & Markdown)**: Issues shall support comments, markdown rich-text, and image uploads (stored in MinIO).

### 3.5 System Administration & Webhooks

- **FR-5.1 (Organization Management)**: Users shall be able to form organizations, create team groups, and manage members.
- **FR-5.2 (Repository Webhooks)**: The system shall allow repository owners to register HTTP endpoints that receive POST payloads on event triggers (e.g., push, issue opened, PR merged).
- **FR-5.3 (LFS Support)**: Git Forge shall support Git LFS, intercepting binary files and uploading them to MinIO via a secure pre-signed S3 URL.

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **NFR-1.1 (Page Load Speed)**: Critical landing pages, user dashboards, and repository code trees must load in under 1.5 seconds (FCP) on normal 4G networks.
- **NFR-1.2 (Git Operation Latency)**: Small repository push/pull latency over SSH/HTTP must keep overhead under 200ms compared to raw git transport speeds.
- **NFR-1.3 (RSC Hybrid Rendering)**: Utilize Next.js React Server Components to pre-render read-heavy code displays on the server, minimizing client JavaScript payload.

### 4.2 Security

- **NFR-2.1 (Transport Security)**: All web and API traffic must force HTTPS with TLS 1.3 encryption. SSH transport must only allow modern secure cipher suites (e.g., Curve25519, Ed25519).
- **NFR-2.2 (Credential Hashing)**: Passwords must be hashed using Argon2id.
- **NFR-2.3 (API Rate Limiting)**: Public endpoints shall implement IP-based and user-based token bucket rate limits (e.g., maximum 60 requests/min for standard users, managed via Redis).
- **NFR-2.4 (Branch Write Isolation)**: Force direct write checks at the Git hook level (pre-receive hook) to block unauthenticated push attempts on protected branches.

### 4.3 Scalability

- **NFR-3.1 (Database Connection Pool)**: Limit NestJS instances' database connections utilizing PgBouncer or NestJS internal Prisma pool optimization.
- **NFR-3.2 (Cache-Aside Strategy)**: Session tokens, repository permissions, and frequent read metadata must be cached in Redis with a TTL of max 15 minutes to offload PostgreSQL.
- **NFR-3.3 (Horizontal Scalability)**: Next.js frontend, NestJS backend, and Git SSH runner instances must be stateless, facilitating horizontal autoscaling via Docker/Kubernetes.

### 4.4 Availability & Reliability

- **NFR-4.1 (High Availability Target)**: The system shall aim for a monthly uptime of 99.9% (excluding planned maintenance windows).
- **NFR-4.2 (Background Job Retry)**: Asynchronous webhooks and notifications managed via BullMQ (Redis) must support automatic retry with exponential backoff.
- **NFR-4.3 (Database Backup)**: Automated database backups must be written to MinIO/S3 daily and retained for 30 days.

---

## 5. User Roles & Permissions

GitForge uses a Role-Based Access Control (RBAC) matrix per repository:

| User Role       | View Code/Issues/PRs |   Push to Branch    | Create Issue/PR | Comment on Issue/PR | Approve PR | Manage Settings / Webhooks | Delete Repository |
| :-------------- | :------------------: | :-----------------: | :-------------: | :-----------------: | :--------: | :------------------------: | :---------------: |
| **Guest**       |  Yes (Public only)   |         No          |       No        |         No          |     No     |             No             |        No         |
| **Reader**      |         Yes          |         No          |       Yes       |         Yes         |     No     |             No             |        No         |
| **Contributor** |         Yes          | Yes (Non-Protected) |       Yes       |         Yes         |     No     |             No             |        No         |
| **Maintainer**  |         Yes          | Yes (All branches)  |       Yes       |         Yes         |    Yes     |            Yes             |        No         |
| **Admin**       |         Yes          | Yes (All branches)  |       Yes       |         Yes         |    Yes     |            Yes             |        Yes        |

---

## 6. System Architecture

The GitForge architecture is designed to handle high I/O Git operations separately from user-facing API interactions.

```
                      +-------------------+
                      |   Client Web App  |
                      |   (Next.js 15)    |
                      +---------+---------+
                                |
                   (HTTPS)      |
             +------------------+------------------+
             |                                     |
             v                                     v
  +--------------------+                +----------------------+
  |    NestJS API      |                |   Git SSH Daemon /   |
  |  (Business Logic)  |                |   HTTP Git CGI       |
  +----+-----+----+----+                +----------+-----------+
       |     |    |                                |
       |     |    |     (Writes / Reads Git Bare)  |
       |     |    +-------------------+            |
       v     v                        v            v
  +----+--+ +--+-----+          +-----+------------+---+
  | Redis | | MinIO  |          |   Shared Git Storage |
  | Cache | | Object |          |    (EFS / NAS / Vol) |
  +-------+ +--------+          +----------------------+
       |
       v
  +----+-----+
  | Postgres |
  | Database |
  +----------+
```

### Architectural Subsystems:

1. **Frontend App (Next.js 15)**: Serves static layout shells, pre-renders code syntax highlighting via Server Actions/RSC, and leverages Tailwind v4 / shadcn/ui for high-fidelity rendering.
2. **Backend API (NestJS)**: Manages metadata workflows, WebSockets (live PR edits), user profiles, issue states, organizations, and permissions logic.
3. **Git Service Controller**: Dedicated service handling the Git SSH server (via `ssh2` npm package or customized OpenSSH) and Git HTTP backend CGI script matching to process remote git commands (`git-receive-pack` and `git-upload-pack`).
4. **Data Tier**:
   - **PostgreSQL**: Stores accounts, repository metadata, issue logs, comments, permissions (via Prisma ORM).
   - **Redis**: Caches API results, handles rate-limiting, and manages BullMQ jobs for webhook deliveries.
   - **MinIO**: S3-compatible service holding LFS large files, custom user avatar assets, and backup archives.

---

## 7. Database Model (Entities & Relationships)

This section defines the key data entities.

### 7.1 Entities

- **User**: Stores profile, hash password, MFA secret, registration timestamps.
- **Repository**: Stores repository name, owner ID, public/private visibility, path to bare git storage, description.
- **BranchProtection**: Links to repository, defining rules (required reviews, status checks).
- **Issue**: Links to Repository and Creator (User). Holds title, status (open/closed), number.
- **PullRequest**: Links to Repository, Base branch, Compare branch, and Creator (User). Holds status (draft, open, merged, closed).
- **Comment**: Polymorphic relationship. Can link to an Issue or a PullRequest. Supports line diff reference coordinates for code comments.
- **Webhook**: Links to Repository or Organization. Stores URL, secret token, and subscribed event triggers.
- **SshKey**: Links to User. Stores SSH title and public key string.

### 7.2 Key Relationships

- **User (1) <---> (N) Repository**: Users own multiple repositories.
- **Repository (1) <---> (N) Issue / PullRequest**: Repositories contain multiple issues and PRs.
- **Issue/PR (1) <---> (N) Comment**: Issues and Pull Requests collect discussion posts.
- **User (1) <---> (N) SshKey**: Users register multiple authentication keys.

---

## 8. API Endpoint Structure

All API services live under `/api/v1` except for the raw git smart HTTP endpoints.

### 8.1 Auth Group (`/api/v1/auth`)

- `POST /signup` - Register a new account.
- `POST /login` - Login and acquire JWT.
- `POST /logout` - Revoke current JWT.

### 8.2 Repository Management (`/api/v1/repos`)

- `GET /` - List user's available repositories.
- `POST /` - Create a repository.
- `GET /:owner/:repo` - Get detailed repository metadata.
- `DELETE /:owner/:repo` - Delete a repository.
- `GET /:owner/:repo/tree/:branch/*` - Fetch folder directory structure and file previews.
- `GET /:owner/:repo/commits/:branch` - Get branch commit history.

### 8.3 Pull Request Management (`/api/v1/pulls`)

- `GET /:owner/:repo/pulls` - List PRs.
- `POST /:owner/:repo/pulls` - Open a PR.
- `GET /:owner/:repo/pulls/:id/diff` - Retrieve computed line-by-line diff.
- `POST /:owner/:repo/pulls/:id/comments` - Post an inline code comment.
- `POST /:owner/:repo/pulls/:id/merge` - Merge a Pull Request.

### 8.4 Issue Tracker (`/api/v1/issues`)

- `GET /:owner/:repo/issues` - Search/list issues.
- `POST /:owner/:repo/issues` - Open a new issue.
- `PATCH /:owner/:repo/issues/:id` - Close/reopen or edit an issue.

### 8.5 Git Smart HTTP Endpoints (`/:owner/:repo.git/*`)

- `GET /info/refs?service=git-upload-pack` - Git clone/pull advertisement.
- `GET /info/refs?service=git-receive-pack` - Git push advertisement.
- `POST /git-upload-pack` - Execute git fetch/clone.
- `POST /git-receive-pack` - Execute git push.

---

## 9. UI Screens (Key Layouts)

### 9.1 Platform Landing Page

- Minimalist hero statement using display-xl typography with stark black text and a deep mesh gradient backdrop.
- "Start Deploying Code" Call to Action with `button-primary` (black pill) and `button-secondary` (white pill).
- Active scroll mockup of a commit timeline showing developer performance metrics.

### 9.2 Repository Explorer Dashboard

- Left sidebar: Repository file tree navigator (`Geist Mono` typography labels, collapsible folders).
- Center pane: Active directory listing, last commit hash/message, rendered Markdown README.
- Right pane: Metadata grid containing active branch selector, clone dropdown links, releases, and contributor badges.

### 9.3 Pull Request Detail & Diff Reviewer

- Top section: PR title, status tag (Open/Merged/Closed), base-to-compare branch badge indicator.
- Tab navigator: "Conversation" (issue-like timeline discussion) and "Files Changed" (the diff engine).
- Diff engine: Side-by-side or unified lines viewer (green/red background alerts), interactive line hover showing "+" buttons to trigger inline review inputs.
