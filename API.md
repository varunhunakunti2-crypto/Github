# API.md — GitHub Clone API Design

> Design only, no implementation code. REST/JSON over HTTPS, versioned under `/api/v1`. Every endpoint below is a design decision — method, path, auth requirement, purpose, request shape, response shape, and status codes — not a code sample.

---

## 1. Conventions

- **Base URL:** `https://api.githubclone.dev/v1`
- **Auth:** `Authorization: Bearer <token>` — session JWT (web) or Personal Access Token (API/CLI). Public GET endpoints on public resources work unauthenticated.
- **Pagination:** cursor-based — `?per_page=30&cursor=<opaque>` — response includes `next_cursor`, `has_more`.
- **Filtering/sorting:** `?state=open&sort=created&direction=desc` where applicable.
- **Errors:** consistent envelope —
```json
{ "error": { "code": "resource_not_found", "message": "Repository not found", "status": 404 } }
```
- **Idempotency:** mutating POSTs that create side-effect-heavy resources (releases, webhooks) accept an `Idempotency-Key` header.
- **Rate limiting:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on every response.
- **Naming:** plural nouns for collections (`/repositories`), singular for a specific resource action context (`/repository` shown in the brief is treated below as `/repositories/{id}` — the canonical REST form; noted explicitly).

---

## 2. Auth & Session

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | none | Create account. Body: `username, email, password`. Sends verification email. |
| POST | `/login` | none | Authenticate. Body: `email/username, password`. Returns session token + refresh token. |
| POST | `/logout` | required | Invalidate current session. |
| POST | `/auth/refresh` | refresh token | Exchange refresh token for new access token. |
| POST | `/auth/verify-email` | none | Body: `token` from verification email. |
| POST | `/auth/forgot-password` | none | Body: `email`. Sends reset link. |
| POST | `/auth/reset-password` | none | Body: `token, new_password`. |
| POST | `/auth/2fa/enable` | required | Begin 2FA setup, returns QR/secret. |
| POST | `/auth/2fa/verify` | required | Body: `code`. Confirms 2FA setup. |
| POST | `/auth/2fa/challenge` | partial session | Body: `code`, during login when 2FA is enabled. |
| GET | `/auth/oauth/{provider}` | none | Redirect to OAuth provider (github/google). |
| GET | `/auth/oauth/{provider}/callback` | none | OAuth callback, exchanges code for session. |

**Request — POST /login**
```json
{ "identifier": "appi@example.com", "password": "••••••••" }
```
**Response — 200**
```json
{ "access_token": "eyJ...", "refresh_token": "rft_...", "expires_in": 3600, "user": { "id": "uuid", "username": "appi" } }
```
**Response — 401** invalid credentials. **Response — 428** (custom) if 2FA challenge required, body includes `challenge_token`.

**Request — POST /signup**
```json
{ "username": "appi", "email": "appi@example.com", "password": "••••••••" }
```
**Response — 201** user object (unverified). **409** if username/email taken. **422** validation errors (weak password, invalid username chars).

---

## 3. Users

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/{username}` | optional | Public profile. |
| GET | `/user` | required | Current authenticated user's full profile. |
| PATCH | `/user` | required | Update own profile (`bio, location, website_url, avatar_url`). |
| DELETE | `/user` | required | Delete own account (soft-delete + grace period). |
| GET | `/users/{username}/repositories` | optional | List a user's repos (respects visibility). |
| GET | `/users/{username}/followers` | optional | List followers. |
| GET | `/users/{username}/following` | optional | List who they follow. |
| PUT | `/user/following/{username}` | required | Follow a user. |
| DELETE | `/user/following/{username}` | required | Unfollow. |
| GET | `/user/starred` | required | Repos the current user has starred. |

---

## 4. Repositories

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories` | optional | List/search repos (`?q=`, `?owner=`, `?visibility=`). Public-only unless authenticated with access. |
| POST | `/repositories` | required | Create a repository. |
| GET | `/repositories/{owner}/{repo}` | optional | Get repo details. |
| PATCH | `/repositories/{owner}/{repo}` | required (admin/maintain) | Update repo settings. |
| DELETE | `/repositories/{owner}/{repo}` | required (admin) | Delete repo. |
| POST | `/repositories/{owner}/{repo}/fork` | required | Fork the repo into the authenticated user's account/org. |
| PATCH | `/repositories/{owner}/{repo}/archive` | required (admin) | Archive/unarchive (`{"archived": true}`). |
| PUT | `/repositories/{owner}/{repo}/star` | required | Star. |
| DELETE | `/repositories/{owner}/{repo}/star` | required | Unstar. |
| PUT | `/repositories/{owner}/{repo}/watch` | required | Watch (body: `notification_level`). |
| DELETE | `/repositories/{owner}/{repo}/watch` | required | Stop watching. |
| GET | `/repositories/{owner}/{repo}/contributors` | optional | Contributor list with commit counts. |

> Note on the brief's `/repository` singular form: real REST design resolves this ambiguity via `/repositories/{owner}/{repo}` as the addressable singular resource — using the actual identifier rather than a bare unparameterized `/repository`, since "which repository" must always be explicit.

**Request — POST /repositories**
```json
{
  "name": "my-project",
  "description": "A sample repo",
  "visibility": "public",
  "organization": null,
  "auto_init": true,
  "gitignore_template": "Node",
  "license_template": "mit"
}
```
**Response — 201**
```json
{
  "id": "uuid", "name": "my-project", "full_name": "appi/my-project",
  "visibility": "public", "default_branch": "main",
  "clone_url": "https://githubclone.dev/appi/my-project.git",
  "created_at": "2026-07-25T10:00:00Z"
}
```
**409** if name already exists under that owner. **422** invalid visibility/name.

**Request — PATCH /repositories/{owner}/{repo}**
```json
{ "description": "Updated description", "default_branch": "develop", "visibility": "private" }
```
**Response — 200** updated repo object. **403** insufficient permission. **404** not found.

**Response — DELETE /repositories/{owner}/{repo}** → **204** no content. **403** if not admin.

---

## 5. Branches

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/branches` | optional | List branches. |
| POST | `/repositories/{owner}/{repo}/branches` | required (write) | Create branch (body: `name, from_ref`). |
| GET | `/repositories/{owner}/{repo}/branches/{branch}` | optional | Branch details incl. head commit. |
| DELETE | `/repositories/{owner}/{repo}/branches/{branch}` | required (write) | Delete branch. |
| PUT | `/repositories/{owner}/{repo}/branches/{branch}/protection` | required (admin) | Set/update protection rules. |
| DELETE | `/repositories/{owner}/{repo}/branches/{branch}/protection` | required (admin) | Remove protection. |

**Request — PUT .../protection**
```json
{
  "require_pr": true, "required_approvals": 1,
  "require_status_checks": true, "required_checks": ["ci/test"],
  "require_signed_commits": false
}
```

---

## 6. Commits & Files

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/commits` | optional | List commits (`?branch=`, `?path=`, `?since=`, `?until=`). |
| GET | `/repositories/{owner}/{repo}/commits/{sha}` | optional | Commit detail (diff summary, parents, stats). |
| GET | `/repositories/{owner}/{repo}/commits/{sha}/diff` | optional | Full diff/patch content. |
| GET | `/repositories/{owner}/{repo}/contents/{path}` | optional | File or folder listing at `?ref=` (branch/sha/tag). |
| PUT | `/repositories/{owner}/{repo}/contents/{path}` | required (write) | Create/update file (base64 content + commit message) — powers GitHub's web-based file editor. |
| DELETE | `/repositories/{owner}/{repo}/contents/{path}` | required (write) | Delete a file (commit message required). |
| GET | `/repositories/{owner}/{repo}/compare/{base}...{head}` | optional | Compare two refs — commits + diff, backs PR creation UI. |

**Request — PUT .../contents/{path}**
```json
{
  "message": "docs: update README",
  "content": "IyBSRUFETUUuLi4=",
  "branch": "main",
  "sha": "abc123...(required if updating an existing file, omit if creating new)"
}
```
**Response — 200/201** new commit object + updated file metadata. **409** if `sha` is stale (someone else edited first — optimistic concurrency).

---

## 7. Issues

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/issues` | optional | List issues (`?state=open`, `?label=`, `?assignee=`, `?milestone=`). |
| POST | `/repositories/{owner}/{repo}/issues` | required (write) | Create issue. |
| GET | `/repositories/{owner}/{repo}/issues/{number}` | optional | Issue detail. |
| PATCH | `/repositories/{owner}/{repo}/issues/{number}` | required (write) | Update title/body/state/assignees/labels/milestone. |
| DELETE | `/repositories/{owner}/{repo}/issues/{number}` | required (admin) | Delete (rare — usually close instead). |
| POST | `/repositories/{owner}/{repo}/issues/{number}/comments` | required (write) | Add comment. |
| GET | `/repositories/{owner}/{repo}/issues/{number}/comments` | optional | List comments. |
| PATCH | `/repositories/{owner}/{repo}/issues/{number}/comments/{id}` | required (author/admin) | Edit comment. |
| DELETE | `/repositories/{owner}/{repo}/issues/{number}/comments/{id}` | required (author/admin) | Delete comment. |

**Request — POST .../issues**
```json
{
  "title": "Login fails on Safari",
  "body": "Steps to reproduce...",
  "labels": ["bug", "priority:high"],
  "assignees": ["username1"],
  "milestone": 3
}
```
**Response — 201** issue object with `number` assigned (per-repo sequential).

**Request — PATCH .../issues/{number}**
```json
{ "state": "closed" }
```

---

## 8. Labels & Milestones

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/labels` | optional | List labels. |
| POST | `/repositories/{owner}/{repo}/labels` | required (write) | Create label (`name, color, description`). |
| PATCH | `/repositories/{owner}/{repo}/labels/{name}` | required (write) | Update label. |
| DELETE | `/repositories/{owner}/{repo}/labels/{name}` | required (write) | Delete label. |
| GET | `/repositories/{owner}/{repo}/milestones` | optional | List milestones. |
| POST | `/repositories/{owner}/{repo}/milestones` | required (write) | Create milestone. |
| PATCH | `/repositories/{owner}/{repo}/milestones/{number}` | required (write) | Update (title/due_date/state). |
| DELETE | `/repositories/{owner}/{repo}/milestones/{number}` | required (write) | Delete. |

---

## 9. Pull Requests

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/pulls` | optional | List PRs (`?state=`, `?base=`, `?head=`). |
| POST | `/repositories/{owner}/{repo}/pulls` | required (write) | Open PR. |
| GET | `/repositories/{owner}/{repo}/pulls/{number}` | optional | PR detail. |
| PATCH | `/repositories/{owner}/{repo}/pulls/{number}` | required (write) | Update title/body/base/draft-status. |
| GET | `/repositories/{owner}/{repo}/pulls/{number}/files` | optional | Changed files/diff. |
| GET | `/repositories/{owner}/{repo}/pulls/{number}/commits` | optional | Commits in the PR. |
| PUT | `/repositories/{owner}/{repo}/pulls/{number}/merge` | required (write, checks passing) | Merge PR (`merge_method`: merge/squash/rebase). |
| POST | `/repositories/{owner}/{repo}/pulls/{number}/reviews` | required (write) | Submit a review (`event`: approve/request_changes/comment). |
| GET | `/repositories/{owner}/{repo}/pulls/{number}/reviews` | optional | List reviews. |
| POST | `/repositories/{owner}/{repo}/pulls/{number}/requested_reviewers` | required (write) | Request reviewers (users/teams). |
| POST | `/repositories/{owner}/{repo}/pulls/{number}/comments` | required (write) | Inline diff comment (`path, line, side, body`). |

**Request — POST .../pulls**
```json
{
  "title": "Add dark mode",
  "body": "Closes #42",
  "head": "feature/dark-mode",
  "base": "main",
  "draft": false
}
```
**Response — 201** PR object with `number`, `mergeable: null` (computed async), `state: "open"`.

**Request — PUT .../pulls/{number}/merge**
```json
{ "merge_method": "squash", "commit_title": "Add dark mode (#57)" }
```
**Response — 200** `{ "merged": true, "sha": "..." }`. **405** if not mergeable (conflicts/failing checks/required reviews missing).

---

## 10. Organizations & Teams

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/organizations` | required | Create org. |
| GET | `/organizations/{org}` | optional | Org profile. |
| PATCH | `/organizations/{org}` | required (owner) | Update org settings/billing email. |
| DELETE | `/organizations/{org}` | required (owner) | Delete org. |
| GET | `/organizations/{org}/members` | required (member) | List members. |
| PUT | `/organizations/{org}/members/{username}` | required (owner) | Invite/add member (body: `role`). |
| DELETE | `/organizations/{org}/members/{username}` | required (owner) | Remove member. |
| GET | `/organizations/{org}/teams` | required (member) | List teams. |
| POST | `/organizations/{org}/teams` | required (owner) | Create team. |
| PATCH | `/organizations/{org}/teams/{slug}` | required (maintainer+) | Update team. |
| DELETE | `/organizations/{org}/teams/{slug}` | required (owner) | Delete team. |
| PUT | `/organizations/{org}/teams/{slug}/members/{username}` | required (maintainer+) | Add member to team. |
| DELETE | `/organizations/{org}/teams/{slug}/members/{username}` | required (maintainer+) | Remove. |
| PUT | `/organizations/{org}/teams/{slug}/repositories/{repo}` | required (maintainer+) | Grant team access to a repo (body: `permission`). |

---

## 11. Permissions & Collaborators

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/collaborators` | required (write) | List individual/team access grants. |
| PUT | `/repositories/{owner}/{repo}/collaborators/{username}` | required (admin) | Grant access (body: `permission`). |
| DELETE | `/repositories/{owner}/{repo}/collaborators/{username}` | required (admin) | Revoke access. |
| GET | `/repositories/{owner}/{repo}/collaborators/{username}/permission` | optional (self) or required (admin) | Check effective permission level. |

---

## 12. Discussions, Wiki, Projects

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/discussions` | optional | List (`?category=`). |
| POST | `/repositories/{owner}/{repo}/discussions` | required (write) | Create. |
| PATCH | `/repositories/{owner}/{repo}/discussions/{number}` | required (author/admin) | Update. |
| POST | `/repositories/{owner}/{repo}/discussions/{number}/comments` | required (write) | Comment. |
| PUT | `/repositories/{owner}/{repo}/discussions/{number}/answer` | required (author/admin) | Mark accepted answer. |
| GET | `/repositories/{owner}/{repo}/wiki/pages` | optional | List wiki pages. |
| GET | `/repositories/{owner}/{repo}/wiki/pages/{slug}` | optional | Page content. |
| PUT | `/repositories/{owner}/{repo}/wiki/pages/{slug}` | required (write) | Create/update page. |
| DELETE | `/repositories/{owner}/{repo}/wiki/pages/{slug}` | required (write) | Delete page. |
| GET | `/projects` | required | List projects visible to user (`?org=`, `?repo=`). |
| POST | `/projects` | required | Create project board. |
| POST | `/projects/{id}/items` | required (write) | Add issue/PR/note to board. |
| PATCH | `/projects/{id}/items/{item_id}` | required (write) | Move between columns/update status. |

---

## 13. Releases & Packages

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/releases` | optional | List releases. |
| POST | `/repositories/{owner}/{repo}/releases` | required (write) | Create release (body: `tag_name, target_commitish, body, draft, prerelease`). |
| GET | `/repositories/{owner}/{repo}/releases/{id}` | optional | Release detail. |
| PATCH | `/repositories/{owner}/{repo}/releases/{id}` | required (write) | Update/publish draft. |
| DELETE | `/repositories/{owner}/{repo}/releases/{id}` | required (write) | Delete. |
| POST | `/repositories/{owner}/{repo}/releases/{id}/assets` | required (write) | Upload asset (multipart). |
| GET | `/repositories/{owner}/{repo}/packages` | optional | List packages. |
| GET | `/repositories/{owner}/{repo}/packages/{name}/versions` | optional | List versions. |
| DELETE | `/repositories/{owner}/{repo}/packages/{name}/versions/{version}` | required (admin) | Remove a version. |

---

## 14. GitHub Actions (CI/CD)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/repositories/{owner}/{repo}/workflows` | optional | List workflow definitions. |
| PATCH | `/repositories/{owner}/{repo}/workflows/{id}` | required (write) | Enable/disable. |
| POST | `/repositories/{owner}/{repo}/workflows/{id}/dispatches` | required (write) | Manually trigger (`workflow_dispatch`), body: `ref, inputs`. |
| GET | `/repositories/{owner}/{repo}/runs` | optional | List workflow runs (`?status=`, `?branch=`). |
| GET | `/repositories/{owner}/{repo}/runs/{id}` | optional | Run detail + jobs. |
| POST | `/repositories/{owner}/{repo}/runs/{id}/cancel` | required (write) | Cancel in-progress run. |
| POST | `/repositories/{owner}/{repo}/runs/{id}/rerun` | required (write) | Rerun (all or failed-only). |
| GET | `/repositories/{owner}/{repo}/runs/{id}/jobs/{job_id}/logs` | required (write) | Fetch job logs. |
| GET | `/repositories/{owner}/{repo}/runs/{id}/artifacts` | required (write) | List artifacts. |
| GET | `/organizations/{org}/runners` | required (admin) | List self-hosted runners. |
| POST | `/organizations/{org}/runners/registration-token` | required (admin) | Get token to register a new runner. |
| DELETE | `/organizations/{org}/runners/{id}` | required (admin) | Remove runner. |
| GET | `/repositories/{owner}/{repo}/secrets` | required (admin) | List secret names (values never returned). |
| PUT | `/repositories/{owner}/{repo}/secrets/{name}` | required (admin) | Create/update secret (value encrypted client-side before send, per GitHub's real libsodium-sealed-box pattern). |
| DELETE | `/repositories/{owner}/{repo}/secrets/{name}` | required (admin) | Delete secret. |

---

## 15. Notifications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/notifications` | required | List current user's notifications (`?unread=true`). |
| PATCH | `/notifications/{id}` | required | Mark read/unread. |
| PUT | `/notifications/read` | required | Mark all as read (`?before=<timestamp>`). |
| DELETE | `/notifications/{id}` | required | Unsubscribe from thread. |
| PUT | `/repositories/{owner}/{repo}/subscription` | required | Set watch/notification level for repo. |

---

## 16. Security & Account Management

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/user/keys` | required | List SSH keys. |
| POST | `/user/keys` | required | Add SSH key (`title, key, key_type`). |
| DELETE | `/user/keys/{id}` | required | Remove SSH key. |
| GET | `/user/tokens` | required | List Personal Access Tokens (metadata only, never raw token after creation). |
| POST | `/user/tokens` | required | Create PAT (`name, scopes, expires_at`) — raw token returned **once** in response body only. |
| DELETE | `/user/tokens/{id}` | required | Revoke token. |
| GET | `/repositories/{owner}/{repo}/webhooks` | required (admin) | List webhooks. |
| POST | `/repositories/{owner}/{repo}/webhooks` | required (admin) | Create webhook (`target_url, events, secret`). |
| PATCH | `/repositories/{owner}/{repo}/webhooks/{id}` | required (admin) | Update. |
| DELETE | `/repositories/{owner}/{repo}/webhooks/{id}` | required (admin) | Delete. |
| GET | `/organizations/{org}/audit-log` | required (owner) | Query audit log (`?action=`, `?from=`, `?to=`). |
| GET | `/user/sessions` | required | List active sessions/devices. |
| DELETE | `/user/sessions/{id}` | required | Revoke a specific session (remote logout). |

---

## 17. Activity Feed & Search

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/user/activity` | required | Personalized feed (repos followed/watched/starred). |
| GET | `/repositories/{owner}/{repo}/activity` | optional | Repo-level event timeline. |
| GET | `/search/repositories` | optional | Search repos (`?q=`, supports qualifiers like `language:`, `stars:>100`). |
| GET | `/search/issues` | optional | Search issues/PRs across repos. |
| GET | `/search/users` | optional | Search users/orgs. |
| GET | `/search/code` | optional | Full-text code search within accessible repos. |

---

## 18. HTTP Status Code Standards (applied across all endpoints)

| Code | Meaning in this API |
|---|---|
| 200 | Success (GET/PATCH/PUT returning a body) |
| 201 | Resource created (POST) |
| 204 | Success, no body (DELETE) |
| 400 | Malformed request syntax |
| 401 | Missing/invalid auth |
| 403 | Authenticated but insufficient permission |
| 404 | Resource not found (also returned instead of 403 for private repos, to avoid leaking existence) |
| 405 | Valid request, but operation not currently allowed (e.g. merge blocked by required checks) |
| 409 | Conflict (duplicate name, stale `sha` on file update) |
| 422 | Validation error (body present but invalid) |
| 428 | Precondition required (custom use: 2FA challenge pending) |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## 19. Versioning & Deprecation Policy (design decision)

- All endpoints live under `/v1`. Breaking changes ship as `/v2`, with `/v1` supported for a documented deprecation window.
- Non-breaking additive changes (new optional fields, new endpoints) ship without a version bump.
- Deprecated endpoints return a `Sunset` header with the retirement date ahead of removal.
