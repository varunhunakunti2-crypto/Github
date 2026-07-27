# GitForge — High-Performance Git Platform Monorepo

GitForge is a high-performance Git hosting and developer collaboration platform. It is structured as a Turborepo monorepo.

## 🚀 Repository Structure

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
