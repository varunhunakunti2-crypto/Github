# GitHub Mastery: Beginner → Expert (Complete Guide)

> One file, everything requested: roadmap, Git internals, all 12 topics, Git deep-cuts, capstone project, interview prep, mastery checklist. Each topic follows: What / Why / How internally / When / Real-world example / Best practices / Mistakes / CLI / GitHub UI / Interview Qs / Practice / Advanced.

---

# PART 0 — ROADMAP

```
STAGE 0  Setup          — install Git, SSH keys, GitHub account
STAGE 1  Foundations    — Git architecture, init/add/commit, repos, branches
STAGE 2  Collaboration  — remotes, PRs, conflicts, Issues
STAGE 3  Intermediate   — Git Flow/GitHub Flow, rebase/cherry-pick/squash, fork workflow
STAGE 4  Automation     — GitHub Actions CI/CD, Releases, SemVer
STAGE 5  Team/Org       — Organizations, Teams, CODEOWNERS, security
STAGE 6  Expert         — internals, LFS, submodules, hooks, enterprise, capstone
```

---

# PART 1 — GIT ARCHITECTURE (Foundational Internals)

### What it is

Git is a **distributed version control system**; every clone holds full history. **GitHub is not Git** — it's a hosting + collaboration layer (PRs, Issues, Actions) built on top of Git.

### Why it exists

Centralized VCS (SVN/CVS) had one server as a single point of failure and made branching expensive. Git (built by Linus Torvalds for Linux kernel dev) makes branching/merging cheap and works fully offline.

### How it works internally — the object model

Git is a content-addressable store: every object is retrieved by the SHA-1 hash of its content.

```
BLOB (file content, no name) → TREE (directory listing: name→hash+mode) → COMMIT (tree + parent + author + message)

Commit graph:
  A ← B ← C  (main)
       \
        D ← E  (feature)
```

Commits are immutable snapshots. "Editing history" (amend/rebase) never mutates a commit — it creates new commits and moves branch pointers.

### The Three Trees

```
Working Tree  --git add-->  Staging/Index  --git commit-->  Repository (.git objects)
     ^                            |
     '------ git restore/checkout -'
```

Staging lets you commit only part of your changes (`git add -p`).

### HEAD

`HEAD` → branch ref (`refs/heads/main`) → commit. **Detached HEAD** = HEAD points directly at a commit, no branch — commits made here can be lost if you switch away without branching.

### When to use / Real-world example

Stage only the 2 files relevant to a bug fix (`git add file1 file2`), leave a 3rd unrelated edit unstaged for a separate commit — atomic, reviewable commits.

### Best practices

Commit small and often; never rewrite history on shared branches; remember unreferenced commits survive ~30-90 days via `reflog` before GC.

### Common mistakes

Thinking `add` "saves" a file (it only stages); panicking after a bad reset (use `git reflog`); committing directly to `main`.

### CLI

```bash
git init
git status
git add -p
git commit -m "msg"
git log --oneline --graph --all
git cat-file -p <hash>
git show HEAD
```

### GitHub UI

Repo's **Insights → Network** graph visualizes the same commit DAG as `git log --graph`.

### Interview Qs

- Git vs GitHub? (tool vs hosting/collaboration platform)
- Git's 4 object types? (blob, tree, commit, tag)
- What is HEAD normally pointing to? (current branch ref → commit)
- Is a commit a diff or snapshot? (full snapshot, internally delta-compressed for storage)

### Practice

`git cat-file -p` on a commit/tree/blob; deliberately detach HEAD, commit, recover via `reflog`; partial-stage a file with `add -p`.

### Advanced

Packfiles + delta compression; `git gc` pruning; content-addressing deduplicates identical content repo-wide.

---

# PART 2 — LOCAL/REMOTE, ORIGIN, UPSTREAM, FETCH/PULL/PUSH, MERGE/REBASE

### Local vs Remote / Origin vs Upstream

**What/Why:** Every clone is a full local repo. `origin` = default name for the remote you cloned from. `upstream` = convention for the _original_ repo when you're working from a fork (not a Git built-in).

```
origin (your fork, read/write) ←→ local clone ←→ upstream (original repo, pull-only)
```

**Internals:** Remotes are just named URLs in `.git/config`; `origin/main` is a _local read-only bookmark_ of the remote's last-known state, updated only on fetch (can be stale).

**Real-world example (OSS contribution):**

```bash
git clone https://github.com/you/project.git
git remote add upstream https://github.com/original/project.git
git fetch upstream
git merge upstream/main
```

**Best practice:** always fetch before merging on top of upstream; never force-push to upstream.
**Mistake:** confusing `origin/main` with the _actual current_ remote state — it's a snapshot from last fetch.

**CLI:** `git remote -v`, `git remote add upstream <url>`, `git fetch upstream`, `git branch -vv`
**GitHub UI:** Forked repo shows "X commits behind" banner + **Sync fork** button.
**Interview Q:** Difference between fetch and pull? (fetch = download only; pull = fetch + merge/rebase)

### Fetch vs Pull vs Push vs Merge vs Rebase

```
MERGE (preserves true history, non-linear):
main:    A---B---C--------M
                  \       /
feature:           D-----E

REBASE (linear, rewrites commits to new hashes):
main:    A---B---C
feature:          \--D'--E'
```

**When:** Merge for shared/public branches (via PR). Rebase only for your own _unpushed_ local commits before opening a PR — **never rebase a branch others have pulled**.

**Real-world example:**

```bash
git checkout main && git pull
git merge feature/login                 # safe, shared-branch approach

git checkout feature/login
git fetch origin && git rebase origin/main
git push --force-with-lease             # only on YOUR own branch
```

**Best practice:** `--force-with-lease` over `--force` (aborts if someone else pushed meanwhile).
**Mistake:** rebasing `main` itself or force-pushing over a teammate's fresh commits.

**CLI:** `git fetch`, `git pull --rebase`, `git push --force-with-lease`, `git rebase -i HEAD~3`
**GitHub UI:** PR merge button choices — _Create a merge commit_ / _Squash and merge_ / _Rebase and merge_ map directly to these strategies.
**Interview Q:** What's a fast-forward merge? (no new commits on target since branching off → pointer just moves forward, no merge commit)

### Cherry-pick, Stash, Tags, Hooks

- **Cherry-pick** — apply one specific commit onto current branch (e.g. hotfix to both `main` and `release`). `git cherry-pick <hash>` — creates a new commit/hash, so repeated cross-branch picks can look duplicated in history.
- **Stash** — shelve uncommitted work to switch branches cleanly. `git stash` / `git stash pop` / `git stash list` — mistake: forgetting stashes pile up silently.
- **Tags** — permanent pointer to a commit for releases. Lightweight (`git tag v1.0.0`) vs Annotated (`git tag -a v1.0.0 -m "msg"`, a real Git object with metadata, can be GPG-signed) — use annotated for releases. Push with `git push origin --tags`.
- **Hooks** — scripts run at lifecycle points (`pre-commit`, `commit-msg`, `pre-push`, server-side `pre-receive`) to enforce standards. Not versioned by default (`.git/hooks/` isn't cloned) — teams use **Husky** or the **pre-commit** framework to share them via the repo.

**Interview Qs:** Lightweight vs annotated tag? Are hooks shared on clone? (No — need a tool like Husky.)

---

# PART 3 — REPOSITORY

**What:** The top-level container for a project's files + full history.
**Why:** Gives every project an isolated, versioned, shareable unit.

**Public vs Private:** Public = anyone can view/clone; Private = access-restricted to invited collaborators/org members. Internal (Enterprise) = visible org-wide only.

**README.md:** First thing visitors see — project purpose, setup, usage, badges. Best practice: include Install, Usage, Contributing, License sections.

**.gitignore:** Tells Git which files/patterns to never track (node_modules, .env, build artifacts). Mistake: committing `.env` with secrets before adding it to `.gitignore` — it stays in history forever unless purged with `git filter-repo` or BFG.

**LICENSE:** Defines legal usage rights (MIT = permissive, GPL = copyleft, Apache 2.0 = permissive + patent grant). No license = "all rights reserved" by default, legally risky for others to use your OSS code.

**Fork vs Clone:**

```
Clone: copies repo to YOUR LOCAL machine (any repo you can read)
Fork:  copies repo to YOUR GITHUB ACCOUNT (a new remote, server-side)
       — used specifically when you don't have push access to the original
```

**Archive Repository:** Makes a repo read-only (no new commits/issues/PRs) — used for deprecated/finished projects; can be unarchived later.

**CLI:**

```bash
git clone <url>
gh repo fork <url> --clone          # GitHub CLI: fork + clone in one step
echo "node_modules/" >> .gitignore
```

**GitHub UI:** repo Settings → General → "Archive this repository"; **Fork** button top-right of any repo page.

**Interview Qs:**

- Fork vs clone? (fork = server-side copy to your account; clone = local copy of any repo)
- What happens to secrets already committed if you add them to .gitignore afterward? (Nothing — still in history; must be purged separately, then rotate the secret.)

**Practice:** Create a public repo with README + .gitignore (Node template) + MIT LICENSE via GitHub's "Initialize repo" options; fork a public repo and compare its remote URL to a plain clone.

**Advanced:** `.gitattributes` for line-ending normalization and marking files as "generated" (excluded from diffs); repo templates (`Use this template` button) for scaffolding new repos.

---

# PART 4 — BRANCH

**What:** A movable pointer to a commit — lets you diverge from main development without affecting it.
**Why:** Enables parallel work (features, fixes, experiments) without breaking a stable line.

**Main branch:** The default, stable/deployable branch (renamed from `master` industry-wide since 2020).
**Feature branches:** Short-lived branches for one unit of work, e.g. `feature/user-auth`.

**Git Flow** (heavier, for versioned/release-based software):

```
main ──────────────●───────────●     (production releases)
                    │           │
release/1.2 ────────●───────────      (stabilize before release)
                    │
develop ──●──●──●───●──●──●──●──     (integration branch)
           │        │
feature/x ─●──●─────●
```

**GitHub Flow** (simpler, for continuous deployment): `main` is always deployable; every change is a short-lived feature branch → PR → review → merge → deploy. No `develop`/`release` branches.

**Trunk-based dev:** Even simpler — everyone commits small changes directly (or via very short-lived branches) to one trunk, feature flags gate incomplete work.

**Branch protection rules:** Settings that block direct pushes to `main`, require PR reviews, require passing CI status checks, require signed commits, before merge is allowed.

**Merge strategies:** Merge commit (preserves full history) / Squash (all commits → one clean commit) / Rebase (linear, replays commits).

**CLI:**

```bash
git branch feature/login
git switch feature/login          # modern alternative to checkout
git checkout -b feature/login     # create + switch, one command
git branch -d feature/login       # delete (safe, only if merged)
git branch -D feature/login       # force delete
```

**GitHub UI:** Settings → Branches → **Add branch protection rule**; require PR before merging, require status checks, require approvals count.

**Interview Qs:**

- Git Flow vs GitHub Flow? (Git Flow: multiple long-lived branches for versioned releases; GitHub Flow: single main branch, continuous deploy)
- Why require branch protection on main? (prevents accidental direct pushes/force-pushes that could break production or lose history)

**Practice:** Set up branch protection requiring 1 approval + passing CI before merge on a test repo; simulate Git Flow with `develop`, `feature/*`, `release/*` branches.

**Advanced:** Merge queues (GitHub feature — serializes merges into main so CI validates the _final_ combined state, not just each PR in isolation); required linear history setting.

---

# PART 5 — COMMIT

**What:** A permanent, immutable snapshot of the staged changes + metadata (author, date, message, parent commit hash).

**Commit lifecycle:** Working tree edit → `git add` (stage) → `git commit` (snapshot into object database, branch pointer advances).

**Commit messages:** Best practice — imperative mood, short summary line (<50 chars) + blank line + body explaining _why_ not _what_. Conventional Commits format: `feat: add login form`, `fix: correct null pointer in auth`.

**Atomic commits:** One logical change per commit — makes `git bisect`, code review, and reverts far easier.

**amend:** Rewrite the _most recent_ commit (message or content) — `git commit --amend`. Never amend a commit already pushed/shared.

**revert:** Create a _new_ commit that undoes a previous commit's changes — safe for shared history (doesn't rewrite anything).

```bash
git revert <hash>
```

**reset:** Move the branch pointer (and optionally staging/working tree) backward.

```bash
git reset --soft <hash>    # move HEAD only, keep changes staged
git reset --mixed <hash>   # move HEAD, unstage changes (default)
git reset --hard <hash>    # move HEAD, discard changes entirely — DESTRUCTIVE
```

**squash:** Combine multiple commits into one, typically via interactive rebase or at PR-merge time — cleans up "wip", "fix typo" noise before merging into main.

**Real-world example:** Feature branch has 12 messy WIP commits → `git rebase -i HEAD~12`, mark 11 as `squash`, end with 1 clean commit: `feat: add OAuth login flow`.

**Best practices:** Never `reset --hard` or `amend` on commits already pushed to a shared branch; use `revert` instead for shared history.
**Mistakes:** Using `reset --hard` and losing uncommitted work permanently (no staging = no reflog safety net for working-tree-only changes); vague messages like "fix stuff."

**CLI:**

```bash
git commit --amend --no-edit
git revert <hash>
git reset --soft HEAD~1
git rebase -i HEAD~5
```

**GitHub UI:** Commit history view shows each commit's message, author, diff; clicking a commit hash shows the exact tree diff.

**Interview Qs:**

- Difference between revert and reset? (revert = new commit undoing changes, safe for shared branches; reset = moves pointer, rewrites local history, unsafe once pushed)
- What's an atomic commit and why does it matter? (one logical change — easier bisect/review/revert)

**Practice:** Make 5 small commits, squash into 1 via interactive rebase; revert a specific past commit without touching anything after it.

**Advanced:** `git bisect` (binary search through commit history to find which commit introduced a bug) pairs directly with atomic commits to be effective.

---

# PART 6 — PULL REQUEST

**What:** A GitHub-specific mechanism to propose merging one branch into another, with review, discussion, and CI checks attached.
**Why:** Enforces code review and automated validation before code reaches shared/production branches.

**Creating PRs:** Push branch → GitHub prompts "Compare & pull request" → fill title/description → optionally link related Issues (`Closes #42`).

**Reviewing PRs:** Reviewers leave inline comments, "Request changes" / "Approve" / "Comment" reviews; suggested-edit blocks reviewers can propose and author can accept with one click.

**Merge conflicts:** Occur when the same lines were changed differently on both branches — Git can't auto-resolve; must manually edit conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).

**Code review best practices:** Small PRs (<400 lines ideally), clear description of _why_, respond to every comment, don't take feedback personally — it's about the code.

**Draft PR:** Marked "not ready for review" — used to get early CI feedback or show work-in-progress without requesting formal review yet.

**Merge options:** Merge commit / Squash and merge / Rebase and merge (same as branch merge strategies, applied at PR time — repo Settings can restrict which options are allowed).

**Real-world example:**

```bash
git checkout -b feature/dark-mode
# ...commits...
git push -u origin feature/dark-mode
gh pr create --fill --base main       # GitHub CLI: opens PR directly from terminal
```

**Common mistakes:** Giant PRs that are impossible to review meaningfully; merging with failing CI; not resolving all review threads before merge.

**CLI:** `gh pr create`, `gh pr list`, `gh pr view <number>`, `gh pr merge --squash`, `gh pr checkout <number>`

**GitHub UI:** PR page tabs — **Conversation** (discussion), **Commits**, **Checks** (CI status), **Files changed** (diff + inline comments).

**Interview Qs:**

- What's a draft PR for? (early feedback/CI without requesting formal review)
- How do you resolve a merge conflict? (edit conflict-marked sections manually, choose correct content, `git add` the resolved file, complete the merge/rebase)

**Practice:** Open a PR against your own repo from a feature branch, deliberately create a merge conflict with a second branch, resolve it, merge via squash.

**Advanced:** **Merge queues**, **required status checks**, **CODEOWNERS**-triggered mandatory reviewers, **auto-merge** (merges automatically once all checks pass).

---

# PART 7 — ISSUES

**What:** GitHub's built-in tracker for bugs, feature requests, tasks, discussions tied to specific work items.

**Bug reports / Feature requests:** Structured via **Issue templates** (`.github/ISSUE_TEMPLATE/`) — forms requiring repro steps, expected vs actual behavior, environment info.

**Labels:** Tags for categorization/triage — `bug`, `enhancement`, `good first issue`, `priority:high`.
**Milestones:** Group issues/PRs toward a target date or release version — track progress as a % complete bar.
**Assignees:** Who's responsible for resolving the issue.
**Templates:** YAML-based forms (`.github/ISSUE_TEMPLATE/bug_report.yml`) enforce structured, high-quality bug reports.
**Linking Issues to PRs:** Using `Closes #42`, `Fixes #42`, `Resolves #42` in a PR description auto-closes the issue when the PR merges.

**Real-world example:** A user reports a login bug via the Bug Report template → maintainer labels it `bug` + `priority:high`, assigns it to Milestone "v2.1", assigns a developer → developer opens PR with `Fixes #42` → issue auto-closes on merge.

**Best practices:** One issue = one problem/request (don't bundle unrelated things); use templates to reduce back-and-forth; triage promptly with labels.
**Mistakes:** Using Issues for general Q&A (that's what Discussions are for); leaving issues unlabeled/untriaged indefinitely.

**CLI:** `gh issue create`, `gh issue list --label bug`, `gh issue close 42`

**GitHub UI:** Issues tab → **New issue** (template picker) → sidebar for Labels/Milestone/Assignee/Projects.

**Interview Qs:**

- How do you auto-close an issue via a PR? (`Fixes #<number>` in PR description/commit message)
- Labels vs Milestones? (labels = categorical tags; milestones = time/version-based grouping toward a goal)

**Practice:** Create a bug-report issue template YAML; open an issue, link it in a PR with `Closes #`, merge and confirm auto-close.

**Advanced:** GitHub Projects (kanban/table views built from Issues+PRs across repos) for full project management.

---

# PART 8 — DISCUSSIONS

**What:** A forum-style space for conversations that aren't a specific bug/task — separate from Issues.
**Categories:** Q&A, Ideas, Show and tell, Announcements, General — customizable per repo.
**Q&A:** Question threads support marking an answer, similar to Stack Overflow.
**Community support:** Reduces Issue-tracker noise from open-ended questions.
**Announcements:** Maintainer-only posting category for release notes/news.

**Best practice:** Redirect "how do I..." questions from Issues to Discussions; pin important threads.
**Mistake:** Using Discussions for actual bugs (they don't have the same triage/label/close workflow as Issues).

**GitHub UI:** Repo Settings → Features → enable **Discussions**; Discussions tab → category dropdown when posting.

**Interview Q:** When would you use Discussions instead of Issues? (Open-ended questions/ideas without a concrete actionable task or bug.)

---

# PART 9 — WIKI

**What:** A repo's dedicated documentation space, itself a Git repository (clonable, versioned Markdown pages).
**Use for:** Long-form docs, architecture decisions, onboarding guides, FAQs — content that doesn't belong in the README but needs to live near the code.

**Best practices:** Keep README as the entry point, Wiki for deep-dives; use consistent page structure/sidebar navigation.
**Mistake:** Letting Wikis go stale — treat them like code, review/update alongside features.

**CLI:** Wikis are clonable: `git clone https://github.com/user/repo.wiki.git`

**GitHub UI:** repo → **Wiki** tab → **New Page**.

**Interview Q:** Is the Wiki version-controlled? (Yes — it's a separate Git repo under the hood.)

---

# PART 10 — RELEASES

**What:** A snapshot of your project at a specific point, packaged with notes and downloadable assets.

**Semantic Versioning (SemVer):** `MAJOR.MINOR.PATCH` — MAJOR = breaking changes, MINOR = backward-compatible features, PATCH = backward-compatible bug fixes. `v2.3.1`.

**Tags:** The underlying Git mechanism a Release is built on (annotated tag + release notes + binaries).
**Changelog:** Human-readable list of changes per version — often auto-generated from Conventional Commits (`feat:`, `fix:`, `BREAKING CHANGE:`).
**Release Assets:** Compiled binaries, installers, or build artifacts attached to a GitHub Release for direct download.

**Real-world example:**

```bash
git tag -a v1.2.0 -m "Add dark mode, fix auth bug"
git push origin v1.2.0
gh release create v1.2.0 --generate-notes ./dist/app.zip
```

**Best practices:** Follow SemVer strictly so consumers can safely auto-update within a MAJOR version; auto-generate changelogs from commit history/PR titles.
**Mistake:** Bumping MAJOR/MINOR/PATCH inconsistently, breaking consumer expectations (e.g. a breaking change released as a PATCH).

**GitHub UI:** repo → **Releases** → **Draft a new release** → pick/create tag, write notes (or auto-generate from merged PRs), attach binaries, **Publish**.

**Interview Q:** What does each SemVer number mean, and why does it matter for dependency management? (npm/pip etc. use SemVer ranges like `^1.2.0` to decide safe auto-updates — breaking that contract breaks downstream builds.)

---

# PART 11 — GITHUB ACTIONS (CI/CD)

**What:** GitHub's built-in automation platform — runs workflows (YAML files in `.github/workflows/`) triggered by repo events.
**Why:** Automates testing, building, and deployment so humans don't manually run these steps (and can't forget to).

**Structure:**

```
Workflow (.yml file)
  └─ Triggers (on: push, pull_request, schedule, workflow_dispatch)
      └─ Jobs (run in parallel by default, on separate runners)
          └─ Steps (sequential, run in the same runner/environment)
              └─ Actions (reusable steps, e.g. actions/checkout@v4)
```

**Runners:** GitHub-hosted (ubuntu-latest, windows-latest, macos-latest) or self-hosted (your own infra).
**Secrets:** Encrypted values (`Settings → Secrets and variables → Actions`) — API keys, tokens — injected as env vars, never exposed in logs.
**Variables:** Non-sensitive config values, same location, different tab from Secrets.
**Matrix builds:** Run the same job across multiple configurations (Node versions, OS) in parallel.
**Deployments:** Workflow steps that push to hosting (Vercel, AWS, Docker registry) on merge to main.
**Reusable workflows:** `workflow_call` trigger — one workflow file invoked by others, avoiding duplication across repos.

**Real-world example (Node.js CI):**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploying..."
        env:
          API_KEY: ${{ secrets.DEPLOY_API_KEY }}
```

**Best practices:** Pin action versions (`@v4`, not `@main`) for reproducibility and supply-chain safety; cache dependencies (`actions/cache`); fail fast on lint/test before expensive deploy jobs run.
**Mistakes:** Hardcoding secrets in workflow files instead of using `secrets.*`; not restricting `pull_request_target` (a common supply-chain attack vector when combined with untrusted PR code); overly broad `GITHUB_TOKEN` permissions.

**CLI:** `gh workflow list`, `gh workflow run <name>`, `gh run list`, `gh run watch`

**GitHub UI:** repo **Actions** tab → workflow runs, logs per step, re-run failed jobs, manually trigger `workflow_dispatch` workflows.

**Interview Qs:**

- Difference between a job and a step? (Jobs run in parallel on separate runners by default; steps run sequentially within one job's runner.)
- How do you share a value between jobs? (Job outputs — `outputs:` on a job, referenced via `needs.<job>.outputs.<name>` in a dependent job.)
- What's a matrix build for? (Testing across multiple versions/OS combinations without duplicating the job definition.)

**Practice:** Build a CI workflow that lints + tests on every PR, and a separate workflow that deploys on merge to main using a secret API key.

**Advanced:** Composite actions (bundle multiple steps into one reusable action); self-hosted runners for GPU/private-network jobs; OIDC federation to cloud providers (avoids storing long-lived cloud credentials as secrets entirely).

---

# PART 12 — ORGANIZATIONS

**What:** A shared account for multiple people to collaboratively own repos, with centralized billing, permissions, and security policy.

**Repository management:** Org-level repos vs personal repos — org repos can enforce org-wide policies (required 2FA, default branch protections).
**Members:** Individuals invited to the org, with an org-wide role (member/owner) plus per-repo/per-team permissions.
**Roles:** Owner (full control, billing), Member (default, access per team/repo grants), Billing manager, Security manager (GitHub Enterprise).
**Permissions:** Read / Triage / Write / Maintain / Admin — granular per-repo access levels, assignable to individuals or Teams.
**Security:** Org-wide 2FA enforcement, SAML SSO (Enterprise), IP allow lists, audit log.
**Billing:** Seats-based (GitHub Free/Team/Enterprise), consumption-based for Actions minutes and Codespaces beyond included quotas.

**Best practices:** Grant permissions via Teams, not individuals directly (scales, auditable); enforce 2FA org-wide; regularly review the audit log.
**Mistake:** Giving everyone Admin "to be safe" — violates least-privilege, increases blast radius of a compromised account.

**GitHub UI:** Org page → **People**, **Teams**, **Settings → Member privileges**, **Settings → Security**.

**Interview Q:** Why manage permissions via Teams instead of per-user? (Scales cleanly, single source of truth, easy onboarding/offboarding by adding/removing from a team.)

---

# PART 13 — TEAMS

**What:** Groups of org members that get repo permissions collectively.

**Team permissions:** Assign a Team a permission level (Read/Write/Maintain/Admin) on one or more repos — every member inherits it.
**CODEOWNERS:** A file (`.github/CODEOWNERS`) mapping file paths to required reviewers/teams — GitHub auto-requests their review on matching PRs, and can be made mandatory via branch protection.

```
# CODEOWNERS example
/apps/api/           @backend-team
/apps/web/            @frontend-team
*.sql                 @data-team
```

**Review assignments:** Combined with CODEOWNERS + branch protection ("Require review from Code Owners") to guarantee the right experts review sensitive code.
**Collaboration:** Nested teams (parent/child) mirror org structure (e.g. `@engineering` parent, `@backend`/`@frontend` children).

**Best practice:** Keep CODEOWNERS in sync with actual team ownership as the codebase evolves — stale entries block PRs on people who've moved teams.
**Mistake:** A CODEOWNERS pattern that's too broad, requiring irrelevant reviewers on every PR and causing review fatigue.

**Interview Q:** What does CODEOWNERS do combined with branch protection? (Forces PRs touching specific paths to get sign-off from the designated owning team before merge is allowed.)

---

# PART 14 — NOTIFICATIONS

**What:** GitHub's system for alerting you to activity relevant to you.

**Watching repositories:** All Activity / Participating & @mentions / Ignore, set per-repo.
**Mention notifications:** Triggered by `@username` in issues/PRs/comments.
**Email vs Web notifications:** Configurable per-type in Settings → Notifications; web notifications appear in the bell icon inbox with per-thread mark-as-read/unsubscribe.
**Notification settings:** Can be scoped per-org, per-repo custom routing (e.g. route one org's notifications to a work email).

**Best practice:** Default to "Participating & @mentions" on noisy repos, "All Activity" only on repos you actively maintain — avoids alert fatigue.
**Mistake:** Leaving every watched repo on "All Activity," causing important mentions to get lost in noise.

**GitHub UI:** Bell icon → notifications inbox with filters (unread, participating, per-repo); Settings → Notifications for global config.

---

# GIT DEEP-CUTS (as requested)

**Submodules:** Embed one Git repo inside another as a pinned reference (specific commit), used for shared libraries kept in separate repos.

```bash
git submodule add https://github.com/org/lib.git libs/lib
git submodule update --init --recursive
```

Mistake: forgetting collaborators need `--recursive` on clone or submodule content is empty.

**Git LFS (Large File Storage):** Stores large binary files (design assets, videos, datasets) as lightweight pointers in Git, actual content in separate LFS storage — keeps repo clone size sane.

```bash
git lfs install
git lfs track "*.psd"
git add .gitattributes
```

**.gitattributes:** Controls line-ending normalization (`* text=auto`), marks generated files to collapse in diffs (`package-lock.json linguist-generated=true`), and configures LFS tracking.

---

# CAPSTONE PROJECT — Using Every Major Feature

**Build:** A small task-management web app ("TaskFlow") as a public GitHub repo, end-to-end.

1. **Repo setup:** Public repo, README, MIT LICENSE, Node `.gitignore`, `.gitattributes`.
2. **Branching:** GitHub Flow — `main` protected (require PR + 1 review + passing CI).
3. **Issues:** Bug report + feature request templates; create 5 starter issues, label + milestone them (`v0.1`).
4. **Development:** Feature branches per issue, atomic commits using Conventional Commits, PRs linked via `Closes #`.
5. **Code review:** Self-simulate by opening PRs from a second local branch, review + squash-merge.
6. **CI/CD:** GitHub Actions workflow — lint + test matrix (Node 18/20) on PR, deploy-on-merge job to a static host (e.g. Vercel/GitHub Pages) using a repo Secret.
7. **Releases:** Tag `v0.1.0` with auto-generated release notes once the milestone's issues are closed.
8. **Docs:** Wiki page for architecture decisions; Discussions category "Ideas" for future feature brainstorming.
9. **Org practice (optional):** Create a free Organization, add the repo, create a `@maintainers` Team, add a CODEOWNERS file, require Code Owner review on `/src/`.
10. **Security:** Enable Dependabot alerts + secret scanning in repo Settings → Security.

---

# INTERVIEW PREP — CONSOLIDATED

1. Git vs GitHub — tool vs. hosting/collaboration platform.
2. Merge vs rebase — history-preserving/non-linear vs. linear/rewritten.
3. Fetch vs pull — download-only vs. download+integrate.
4. Reset vs revert — rewrites history (local/unsafe on shared branches) vs. new undo-commit (safe anywhere).
5. Fork vs clone — server-side account copy vs. local machine copy.
6. Origin vs upstream — your remote vs. the original repo you forked from.
7. What's a fast-forward merge? — pointer just advances, no merge commit needed.
8. Lightweight vs annotated tag — plain pointer vs. full Git object with metadata/signature.
9. What does CODEOWNERS do? — auto-requires/enforces review from designated owners on matching paths.
10. Job vs step in Actions — parallel isolated runners vs. sequential steps within one runner.
11. SemVer breakdown — MAJOR.MINOR.PATCH and what triggers each.
12. Why avoid rebasing shared branches? — rewrites commit hashes, breaks everyone else's history/tracking.
13. What is detached HEAD and why is it risky? — HEAD points directly to a commit; uncommitted work there can be lost without branching off first.
14. What's the difference between Issues and Discussions? — actionable trackable work items vs. open-ended conversation.

---

# MASTERY CHECKLIST

Foundations

- [ ] Explain Git's object model (blob/tree/commit/tag) from memory
- [ ] Explain HEAD, staging area, working tree without notes
- [ ] Comfortable with add/commit/status/log/diff daily

Collaboration

- [ ] Can resolve a merge conflict confidently
- [ ] Can open, review, and merge a PR with the right strategy
- [ ] Use Issues + templates + labels + milestones for real tracking

Intermediate

- [ ] Can rebase, squash, cherry-pick, amend, revert appropriately (know when NOT to)
- [ ] Understand Git Flow vs GitHub Flow and can argue for one on a real project
- [ ] Comfortable contributing to an external OSS repo via fork + upstream

Automation

- [ ] Can write a working CI workflow from scratch (lint/test/matrix)
- [ ] Can set up a deploy-on-merge workflow with secrets
- [ ] Understand SemVer and can cut a proper release

Team/Org

- [ ] Can structure Team permissions + CODEOWNERS for a real org
- [ ] Understand security settings (2FA, branch protection, secret scanning)

Expert

- [ ] Comfortable with submodules and Git LFS
- [ ] Can write/enforce a pre-commit hook
- [ ] Completed the capstone project end-to-end using every feature above
