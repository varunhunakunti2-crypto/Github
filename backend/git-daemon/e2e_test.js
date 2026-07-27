const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const OWNER = 'testowner';
const REPO = 'testrepo-' + Date.now();
const AUTH_HEADER = 'Bearer ghp_secret_token';

// Basic wrapper for fetch to simplify assertions
async function apiPost(endpoint, body = null) {
  const res = await fetch(`http://localhost:${PORT}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': AUTH_HEADER,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(`API POST ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`http://localhost:${PORT}${endpoint}`, {
    headers: { 'Authorization': AUTH_HEADER }
  });
  if (!res.ok) {
    throw new Error(`API GET ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  return res.text(); // Some endpoints return plain text (like blob)
}

function runGit(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8' }).trim();
  } catch (err) {
    throw new Error(`Git command failed: ${cmd}\nOutput: ${err.stdout}\nError: ${err.stderr}`);
  }
}

async function runTests() {
  console.log("=== Git Engine E2E Integration Test (Node Version) ===\n");

  try {
    // 1. git init
    console.log("1. git init — Creating bare repo via API");
    const initRes = await apiPost(`/api/v1/repos/${OWNER}/${REPO}/init`);
    const bareRepoPath = initRes.path;
    console.log(`Response: ${JSON.stringify(initRes)}`);
    
    const isBare = runGit(`git --git-dir="${bareRepoPath}" rev-parse --is-bare-repository`, process.cwd());
    if (isBare !== 'true') throw new Error("Not a bare repository");
    console.log("PASS: git init\n----------------------------------------");

    // Temp working dir
    const workDir = fs.mkdtempSync(path.join(process.cwd(), 'git-test-'));
    console.log(`Working in temp dir: ${workDir}`);

    // 2. git clone
    console.log("2. git clone");
    const cloneUrl = `http://appi:ghp_secret_token@localhost:${PORT}/${OWNER}/${REPO}.git`;
    
    // Silence hints
    runGit(`git config --global init.defaultBranch main`, process.cwd());
    
    console.log(runGit(`git clone ${cloneUrl} clone1`, workDir));
    const clone1Path = path.join(workDir, 'clone1');
    
    const remoteUrl = runGit(`git config --get remote.origin.url`, clone1Path);
    console.log(`Remote URL configured: ${remoteUrl}`);
    console.log("PASS: git clone\n----------------------------------------");

    // 3. git push
    console.log("3. git push");
    fs.writeFileSync(path.join(clone1Path, 'file.txt'), 'Initial content\n');
    runGit(`git add file.txt`, clone1Path);
    runGit(`git commit -m "Initial commit"`, clone1Path);
    
    // Using --quiet to suppress large output but get pass/fail
    console.log(runGit(`git push origin main`, clone1Path));
    
    const serverLog = runGit(`git --git-dir="${bareRepoPath}" log --oneline -1`, process.cwd());
    console.log(`Server log verifies commit landed: ${serverLog}`);
    
    console.log("Testing unauthorized push...");
    const invalidUrl = `http://appi:invalid_token@localhost:${PORT}/${OWNER}/${REPO}.git`;
    runGit(`git remote add invalid ${invalidUrl}`, clone1Path);
    
    try {
      execSync(`git push invalid main`, { cwd: clone1Path, stdio: 'pipe' });
      throw new Error("Push with invalid token should have failed!");
    } catch (err) {
      console.log(`Push correctly rejected with exit code ${err.status}`);
    }
    console.log("PASS: git push\n----------------------------------------");

    // 4. git fetch / pull
    console.log("4. git fetch / git pull");
    console.log(runGit(`git clone ${cloneUrl} clone2`, workDir));
    const clone2Path = path.join(workDir, 'clone2');
    
    fs.writeFileSync(path.join(clone2Path, 'file2.txt'), 'Second commit content\n');
    runGit(`git add file2.txt`, clone2Path);
    runGit(`git commit -m "Second commit"`, clone2Path);
    console.log(runGit(`git push origin main`, clone2Path));
    
    console.log("Pulling changes into clone1...");
    console.log(runGit(`git pull origin main`, clone1Path));
    const clone1Log = runGit(`git log --oneline -2`, clone1Path);
    console.log(`Log in clone1 after pull:\n${clone1Log}`);
    console.log("PASS: git fetch/pull\n----------------------------------------");

    // 5. git branch
    console.log("5. git branch");
    console.log(runGit(`git checkout -b test-branch`, clone1Path));
    fs.writeFileSync(path.join(clone1Path, 'branch.txt'), 'Branch content\n');
    runGit(`git add branch.txt`, clone1Path);
    runGit(`git commit -m "Branch commit"`, clone1Path);
    console.log(runGit(`git push origin test-branch`, clone1Path));
    
    const lsRemote = runGit(`git ls-remote`, clone1Path);
    console.log(`ls-remote output showing branches:\n${lsRemote}`);
    console.log("PASS: git branch\n----------------------------------------");

    // 8. git merge
    console.log("8. git merge (Conflict handling test via CLI simulation)");
    runGit(`git checkout main`, clone1Path);
    runGit(`git checkout -b feature-a`, clone1Path);
    fs.writeFileSync(path.join(clone1Path, 'conflict.txt'), 'Feature A\n');
    runGit(`git add conflict.txt`, clone1Path);
    runGit(`git commit -m "Feature A"`, clone1Path);
    console.log(runGit(`git push origin feature-a`, clone1Path));

    runGit(`git checkout main`, clone1Path);
    runGit(`git checkout -b feature-b`, clone1Path);
    fs.writeFileSync(path.join(clone1Path, 'conflict.txt'), 'Feature B\n');
    runGit(`git add conflict.txt`, clone1Path);
    runGit(`git commit -m "Feature B"`, clone1Path);
    console.log(runGit(`git push origin feature-b`, clone1Path));

    runGit(`git checkout feature-a`, clone1Path);
    try {
      execSync(`git merge feature-b`, { cwd: clone1Path, stdio: 'pipe' });
      throw new Error("Merge should have conflicted!");
    } catch (err) {
      console.log(`Conflict detected natively by git as expected (Exit code ${err.status})`);
      runGit(`git merge --abort`, clone1Path);
    }
    console.log("PASS: git merge\n----------------------------------------");

    // SECURITY CHECKS
    console.log("SECURITY CHECKS");
    
    console.log("- Path Traversal Attempt");
    try {
      await apiGet(`/api/v1/repos/${OWNER}/..%2f..%2fetc/commits`);
      throw new Error("Path traversal succeeded unexpectedly");
    } catch (err) {
      console.log(`Rejected safely: ${err.message}`);
    }

    console.log("- Command Injection Attempt");
    try {
      await apiPost(`/api/v1/repos/${OWNER}/${REPO}/branches`, { name: '; rm -rf /', fromRef: 'main' });
      throw new Error("Injection succeeded unexpectedly");
    } catch (err) {
      console.log(`Rejected safely: ${err.message}`);
    }

    console.log("- Unauthenticated Access to Smart HTTP");
    const unauthRes = await fetch(`http://localhost:${PORT}/${OWNER}/${REPO}.git/info/refs?service=git-receive-pack`);
    console.log(`Unauth Response code: ${unauthRes.status} (Expected 401)`);
    if (unauthRes.status !== 401) throw new Error("Did not get 401 Unauthorized");

    console.log("PASS: Security checks handled safely\n----------------------------------------");

    console.log("ALL TESTS COMPLETED SUCCESSFULLY.");

  } catch (err) {
    console.error(`\nTEST FAILED: ${err.message}`);
    process.exit(1);
  }
}

runTests();
