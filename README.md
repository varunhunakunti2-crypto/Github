# GitForge — High-Performance Git Platform Monorepo

GitForge is a high-performance Git hosting and developer collaboration platform. It is structured as a Turborepo monorepo.

## 🚀 Repository Structure

> **Note on Databases:** This project explicitly requires **PostgreSQL**. A temporary fallback to SQLite was previously used for local development when Postgres was unavailable, but the schema requires Postgres-specific features (Enums, String Arrays). Please ensure PostgreSQL is running before applying migrations.
- **[frontend/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/frontend)** — Next.js 15 App Router web interface.
- **[backend/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/backend)** — NestJS REST API server.
- **[backend/git-daemon/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/backend/git-daemon)** — SSH key gateway and Git hosting daemon service.
- **[packages/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/packages)** — Shared packages used by the projects:
  - `database` — Prisma schema and database client wrapper.
  - `ui` — Reusable react component library.
  - `types` — Common TypeScript models/interfaces.
  - `tsconfig` — Shared TypeScript compiler options.
- **[docs/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/docs)** — System Requirement Specifications (SRS) and architecture references.
- **[docker/](file:///c:/Users/varun/Music/New%20folder/Projects/Github/docker)** — Postgres Database, Redis Cache, and MinIO Object Storage infrastructure.

## ✨ Implemented Core Features

### 📂 Phase 11 — Repository Browser
- **Repository Overview Shell**: Persistent branch/tag selector, Quick-clone URL container box, and tabbed section navigation.
- **File Explorer listing**: Batched `git log -1` lookup resolving last commit message, date, and SHA.
- **Dynamic File Viewer**: Interactive Markdown rendering, syntax highlighted Monaco-powered viewer, line-level anchor selections, and large-file upload safety constraints.
- **Historical logs & Path commits**: Complete commit log history filterable by directory paths.

### 📝 Phase 12 — In-Browser Editor
- **Monaco Setup**: Custom dark theme registered to Monaco matching our theme tokens.
- **Dynamic edit pipeline**: Real-time syntax detection and inline workspace diffs.
- **Atomic Operations**: Integrations for multi-file staging updates, file path renames (single transaction), and deletion confirmations.

### 🌿 Phase 13 — Branch Management
- **Branch Management Dashboard**: Pinning default branches, ahead/behind statistics counts, and safe delete triggers.
- **Create ref wizard**: Compliant validation checks (`git-check-ref-format` spec) and source targeting options.
- **Atomic server merges**: In-memory `merge-tree --write-tree` merges on bare repositories that return clean conflict diagnostics.

### ⏱️ Phase 14 — Commit Detail View
- **Date-grouped Timeline**: Commits grouped by calendar date with copy-to-clipboard actions and GPG badges.
- **Commit Details & Author Section**: Message body renderer, separate committer/author logs, parent SHAs.
- **Structured diff preview**: Expandable Monaco `CodeDiffEditor` panels showing additions/deletions side-by-side or inline.

### 🔀 Phase 15 — Pull Requests
- **PR Lifecycle & Comparison**: Open PRs comparing branches across repositories/forks with merge conflict checking.
- **Line-Level Code Review**: Inline comments on diff views with multi-user threaded discussions and conversation resolution states.
- **Merge Actions**: Integrated squash, rebase, and standard merge commit operations on bare repositories with automatic database synchronization.

### 📋 Phase 16 — Issue Tracking & Boards
- **Issue Lifecycle**: Rich Markdown description, milestones, assignees, and custom category labels.
- **Project Boards**: Kanban board support for tracking issues and pull requests through custom workflows.

### 💬 Phase 17 — Discussions
- **Collaborative Forums**: Threaded Q&A, categories, and Markdown-rendered discussions per repository with read/write permission checks.

### 📖 Phase 18 — Wiki Engine
- **Knowledge Base**: E2E Wiki management supporting page histories, custom sidebars, Markdown editing, and visibility checks.

### 📦 Phase 19 — Releases & Assets
- **Release Hub**: Management of release tags (annotated), auto-generated changelogs, gated streaming downloads, and multipart asset uploads (backed by MinIO object storage).

### 🖥️ Phase 20–24 — Package Registries & Platform Context
- **Registries, Notifications & Search**: Integrations for notification center, package registries (npm/npm-like packages), global/scoped search with Postgres TSVECTOR indexing.
- **Projects & Organizations**: Organization profile workspaces, team groupings, granular member permissions, and project scopes.

### ⚙️ Phase 25 — Actions CI/CD Pipeline
- **Workflows & Runs**: Pipeline orchestration triggered by Git events (push, pull_request) resolving and running defined actions.

### ⚡ Phase 29 — Optimization, Caching & Audits
- **Redis Cache-Aside Layer**: 10x read performance boost for repository metadata and permission check lookups with immediate security-revocation invalidation. README rendering cached for 5 minutes.
- **Database Index Optimization**: Execution plans verified via `EXPLAIN ANALYZE` ensuring index-scanned queries for repository lookup, notification counts, and issues.
- **Accessibility (WCAG 2.1 AA)**: Zero-critical/zero-serious issues verified via axe-core audits. Accessible Monaco Editor keyboard escape triggers and keyboard-navigable Kanban boards.
- **SEO & Server-Side Rendering**: Hydrated metadata tags and search crawlers configuration with dynamic `sitemap.xml` and route-specific `robots.txt` rules.

### 🎨 Linear Design System
- Stark dark marketing canvas based on deep charcoal/black surfaces (`#010102` canvas, `#0f1011` to `#191a1b` surfaces) and 1px hairline borders (`#23252a`).
- Brand chromatic accent in Linear lavender-blue (`#5e6ad2`) and hover state (`#828fff`).
- SF Pro Display / Inter typography stack with negative letter-spacing scaling for DISPLAY styles.

## ⚙️ Development Quickstart

1. **Prerequisites**: Make sure Docker is running on your machine.
2. **Environment & Keys Setup**:
   Run the PowerShell setup script from the root:
   ```powershell
   ./scripts/setup-dev-env.ps1
   ```
3. **Database and Services**:
   Start Postgres, Redis, and MinIO:
   ```powershell
   docker compose -f docker/docker-compose.yml up -d
   ```
4. **Install Dependencies**:
   ```sh
   npm install
   ```
5. **Run Dev Servers**:
   Launch both Next.js and NestJS servers in development mode:
   ```sh
   npm run dev
   ```
