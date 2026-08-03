const { prisma } = require('@gitforge/database');
const path = require('path');
const fs = require('fs');

async function testGitEngine() {
  console.log("==================================================");
  console.log("Git Engine & Authorization Regression Tests");
  console.log("==================================================");

  const results = [];
  const recordResult = (name, status, evidence) => {
    results.push({ name, status, evidence });
    console.log(`[TEST] ${name} | ${status} | ${evidence}`);
  };

  const { GitOperationsService } = require('../../backend/git-daemon/dist/services/git-operations.service');
  const { RepoInitService } = require('../../backend/git-daemon/dist/services/repo-init.service');
  const gitOps = new GitOperationsService();
  const repoInit = new RepoInitService();

  // Find or create test user
  let testUser = await prisma.user.findFirst({ where: { username: 'git_engine_tester' } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        username: 'git_engine_tester',
        email: 'tester@gitforge.local',
        passwordHash: 'dummy',
      }
    });
  }

  const owner = testUser.username;
  const repoName = `test-engine-${Date.now().toString().slice(-4)}`;

  // 1. Initialize Bare Repository
  try {
    const initRes = await repoInit.initBareRepo(owner, repoName);
    if (initRes && initRes.path && initRes.path.includes(repoName)) {
      recordResult("1. Init Bare Repository", "PASS", `Initialized bare repo successfully at ${initRes.path}`);
    } else {
      recordResult("1. Init Bare Repository", "FAIL", "Initialization returned failure status");
    }
  } catch (e) {
    recordResult("1. Init Bare Repository", "FAIL", e.message);
  }

  // 2. Commit File via Operations
  try {
    const commitSha = await gitOps.commitFile(owner, repoName, testUser, {
      branch: 'main',
      message: 'Initial Commit by test suite',
      files: [
        { path: 'README.md', content: '# Hello GitForge Engine' }
      ]
    });

    if (commitSha && commitSha.length === 40) {
      recordResult("2. Commit File Write", "PASS", `Created commit successfully. Commit SHA: ${commitSha}`);
    } else {
      recordResult("2. Commit File Write", "FAIL", `Returned invalid SHA: ${commitSha}`);
    }
  } catch (e) {
    recordResult("2. Commit File Write", "FAIL", e.message);
  }

  // 3. Retrieve Tree (with Cache check)
  try {
    const tree = await gitOps.getTree(owner, repoName, 'main', '');
    const readmeEntry = tree.find(entry => entry.name === 'README.md');
    if (readmeEntry && readmeEntry.lastCommitMessage.includes('test suite')) {
      recordResult("3. Read File Tree & Cache", "PASS", "Correctly loaded README last commit and entry metadata from cache/daemon");
    } else {
      recordResult("3. Read File Tree & Cache", "FAIL", "README entry not found or has incorrect commit message");
    }
  } catch (e) {
    recordResult("3. Read File Tree & Cache", "FAIL", e.message);
  }

  // 4. Token Scope Authorization Check
  try {
    const { ScopeGuard } = require('../../backend/dist/common/guards/scope.guard');
    const { Reflector } = require('@nestjs/core');
    const reflector = new Reflector();
    const guard = new ScopeGuard(reflector);

    let activeRequiredScopes = [];
    reflector.get = (key, target) => activeRequiredScopes;
    reflector.getAllAndOverride = (key, targets) => activeRequiredScopes;

    const mockContext = (scopes) => ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          pat: { scopes },
          route: { path: '/repositories' }
        })
      })
    });

    activeRequiredScopes = ['repo'];

    try {
      await guard.canActivate(mockContext(['read:repo']));
      recordResult("4. Token Write Scope Enforcement", "FAIL", "Read-only token allowed to write");
    } catch (err) {
      if (err.message.includes('Personal Access Token lacks the required scope')) {
        recordResult("4. Token Write Scope Enforcement", "PASS", `Blocked write successfully with exception: "${err.message}"`);
      } else {
        recordResult("4. Token Write Scope Enforcement", "FAIL", err.message);
      }
    }
  } catch (e) {
    recordResult("4. Token Write Scope Enforcement", "FAIL", e.message);
  }

  // Clean up test directories
  try {
    const repoPath = path.join(process.cwd(), 'data', 'repos', owner, `${repoName}.git`);
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  } catch (e) {}

  console.log("==================================================");
}

testGitEngine().catch(console.error);
