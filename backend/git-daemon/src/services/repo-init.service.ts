import * as fs from 'fs';
import * as path from 'path';
import { GitCommandRunner, GitCommandError } from '../utils/git-command-runner';

export class RepoInitService {
  private readonly dataBasePath: string;

  constructor() {
    // In production, this would be injected via config or environment variable
    this.dataBasePath = process.env.GIT_DATA_PATH || path.join(process.cwd(), 'data', 'repos');
  }

  /**
   * Initializes a new bare git repository securely.
   * 
   * @param owner The username or organization name owning the repo
   * @param repo The repository name (without .git extension)
   * @param defaultBranch The initial branch name (e.g. 'main')
   */
  async initBareRepo(owner: string, repo: string, defaultBranch: string = 'main'): Promise<{ path: string }> {
    // 1. Build and validate paths using secure utility
    const repoPath = GitCommandRunner.buildRepoPath(this.dataBasePath, owner, repo);

    // 2. Idempotency Check
    if (fs.existsSync(repoPath)) {
      throw new Error(`Repository already exists at path: ${repoPath}`);
    }

    try {
      // 3. Ensure parent directory exists (e.g. /data/repos/owner)
      const ownerDir = path.dirname(repoPath);
      if (!fs.existsSync(ownerDir)) {
        fs.mkdirSync(ownerDir, { recursive: true });
      }

      // 4. Execute git init --bare {repoPath} --initial-branch={defaultBranch}
      // Pass paths and parameters strictly as distinct array arguments.
      await GitCommandRunner.execute([
        'init',
        '--bare',
        `--initial-branch=${defaultBranch}`,
        repoPath
      ]);

      // 5. Explicitly set permissions/configs on the new bare repo if needed
      // (e.g. allowing push to checked out branch is irrelevant for bare repos,
      // but we could set receive.denyNonFastForwards etc.)
      await GitCommandRunner.execute([
        'config',
        'core.logAllRefUpdates',
        'true'
      ], { cwd: repoPath });

      this.writeHooks(repoPath);

      return { path: repoPath };
    } catch (err) {
      // Cleanup partially created directory on failure
      if (fs.existsSync(repoPath)) {
        try {
          fs.rmSync(repoPath, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.error(`Failed to cleanup directory ${repoPath} after git init failure`, cleanupErr);
        }
      }
      
      if (err instanceof GitCommandError) {
        throw new Error(`Failed to initialize bare repository: ${err.stderr || err.message}`);
      }
      throw err;
    }
  }

  public writeHooks(repoPath: string) {
    const hooksDir = path.join(repoPath, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    const preReceiveContent = `#!/usr/bin/env node
const fs = require('fs');
const http = require('http');

const input = fs.readFileSync(0, 'utf-8').trim();
if (!input) process.exit(0);

const lines = input.split('\\n');
const payload = {
  repoPath: process.cwd(),
  changes: lines.map(line => {
    const [oldSha, newSha, refName] = line.split(' ');
    return { oldSha, newSha, refName };
  })
};

const reqData = JSON.stringify(payload);
const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/api/v1/internal/pre-receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(reqData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode >= 400) {
      try {
        const parsed = JSON.parse(body);
        console.error('\\n==================================================');
        console.error('GitForge Push Protection Blocked:');
        console.error(parsed.message || body);
        console.error('==================================================\\n');
      } catch (e) {
        console.error('\\nGitForge Push Protection Blocked:\\n' + body);
      }
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
});

req.on('error', (err) => {
  console.error('GitForge pre-receive hook error connecting to daemon:', err.message);
  process.exit(0);
});

req.write(reqData);
req.end();
`;

    const postReceiveContent = `#!/usr/bin/env node
const fs = require('fs');
const http = require('http');

const input = fs.readFileSync(0, 'utf-8').trim();
if (!input) process.exit(0);

const lines = input.split('\\n');
const payload = {
  repoPath: process.cwd(),
  changes: lines.map(line => {
    const [oldSha, newSha, refName] = line.split(' ');
    return { oldSha, newSha, refName };
  })
};

const reqData = JSON.stringify(payload);
const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/api/v1/internal/post-receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(reqData)
  }
}, (res) => {
  res.on('data', () => {});
  res.on('end', () => process.exit(0));
});

req.on('error', () => process.exit(0));
req.write(reqData);
req.end();
`;

    fs.writeFileSync(path.join(hooksDir, 'pre-receive'), preReceiveContent, { mode: 0o755 });
    fs.writeFileSync(path.join(hooksDir, 'post-receive'), postReceiveContent, { mode: 0o755 });
  }
}
