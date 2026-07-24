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
