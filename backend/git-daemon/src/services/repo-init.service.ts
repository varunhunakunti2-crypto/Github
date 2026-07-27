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
}
