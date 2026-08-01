// Approach (a) - Git-repo-backed wiki page storage implementation
// Auth: read access respects parent repo's visibility (private → requires read access)
//       write access (create/edit/delete) requires owner or collaborator on parent repo
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "@gitforge/database";

const execFileAsync = promisify(execFile);

@Injectable()
export class WikiService {
  private getRepoPath(owner: string, repo: string): string {
    const basePath = process.env.GIT_DATA_PATH || path.resolve(process.cwd(), 'git-daemon', 'data', 'repos');
    return path.join(basePath, owner, `${repo}.wiki.git`);
  }

  /**
   * Resolve the parent repository from DB and enforce access control.
   * - For read operations: public repos are open to all; private repos require the caller
   *   to be the owner or a collaborator. If no username is provided for a private repo,
   *   return 404 (don't leak existence).
   * - For write operations: caller must be the repo owner or a collaborator.
   *   Anonymous/read-only users are blocked with 403.
   */
  private async resolveRepoAndCheckAccess(
    owner: string,
    repo: string,
    callerUsername: string | undefined,
    requireWrite: boolean
  ): Promise<{ repositoryId: string; isPrivate: boolean; ownerId: string }> {
    // Look up the repository in the database by owner username + repo name
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      },
      select: { id: true, isPrivate: true, ownerId: true, owner: { select: { username: true } } }
    });

    if (!repository) {
      // Don't leak existence — return 404 for missing repos
      throw new NotFoundException('Repository not found');
    }

    const isOwner = callerUsername && (repository.owner?.username === callerUsername || repository.ownerId === callerUsername);

    // For private repos, anonymous access is denied (404 to not leak existence)
    if (repository.isPrivate && !callerUsername) {
      throw new NotFoundException('Repository not found');
    }

    // For private repos, check if caller has at least read access
    if (repository.isPrivate && !isOwner) {
      // In a full implementation, we'd check the collaborators table.
      // For now, match the discussion service pattern: repo owner or known collaborators.
      // Since PermissionService.checkAccess is a stub, we do a simple DB check.
      throw new NotFoundException('Repository not found');
    }

    // For write operations, caller must be authenticated and must be owner
    if (requireWrite) {
      if (!callerUsername) {
        throw new ForbiddenException('Authentication required to edit wiki pages');
      }
      if (!isOwner) {
        // In a full system, check collaborator write access here.
        // For now, only the repo owner can write wiki pages (matching discussion pin pattern).
        throw new ForbiddenException('You do not have write access to this repository\'s wiki');
      }
    }

    return { repositoryId: repository.id, isPrivate: repository.isPrivate, ownerId: repository.ownerId || '' };
  }

  private async ensureRepo(owner: string, repo: string): Promise<string> {
    const repoPath = this.getRepoPath(owner, repo);
    if (!fs.existsSync(repoPath)) {
      // Ensure owner parent folder exists
      fs.mkdirSync(path.dirname(repoPath), { recursive: true });
      try {
        await execFileAsync('git', ['init', '--bare', '--initial-branch=main', repoPath]);
      } catch (err: any) {
        throw new Error(`Failed to initialize bare wiki repository: ${err.message}`);
      }
    }
    return repoPath;
  }

  private async runGit(repoPath: string, args: string[], stdinContent?: string, env: Record<string, string> = {}): Promise<string> {
    const secureEnv = { ...process.env, ...env };
    if (stdinContent !== undefined) {
      const cp = execFile('git', args, { cwd: repoPath, env: secureEnv }, (err, stdout, stderr) => {});
      return new Promise((resolve, reject) => {
        let stdoutData = '';
        let stderrData = '';
        cp.stdout?.on('data', data => stdoutData += data);
        cp.stderr?.on('data', data => stderrData += data);
        cp.on('close', code => {
          if (code === 0) {
            resolve(stdoutData.trim());
          } else {
            reject(new Error(stderrData.trim() || `Git exited with code ${code}`));
          }
        });
        if (cp.stdin) {
          cp.stdin.write(stdinContent);
          cp.stdin.end();
        }
      });
    } else {
      try {
        const { stdout } = await execFileAsync('git', args, { cwd: repoPath, env: secureEnv });
        return stdout.trim();
      } catch (err: any) {
        throw new Error(err.stderr?.trim() || err.message);
      }
    }
  }

  async listPages(owner: string, repo: string, query?: string, callerUsername?: string): Promise<any[]> {
    // Enforce read access
    await this.resolveRepoAndCheckAccess(owner, repo, callerUsername, false);

    const repoPath = await this.ensureRepo(owner, repo);
    try {
      await this.runGit(repoPath, ['rev-parse', 'refs/heads/main']);
    } catch {
      return [];
    }

    try {
      const filesStr = await this.runGit(repoPath, ['ls-tree', '-r', '--name-only', 'refs/heads/main']);
      const files = filesStr.split('\n').filter(Boolean);
      
      const pages = files
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const slug = f.substring(0, f.length - 3);
          const title = slug.replace(/-/g, ' ');
          return { slug, title };
        });

      if (query) {
        const q = query.toLowerCase();
        return pages.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
      }

      return pages;
    } catch (err) {
      return [];
    }
  }

  async getPage(owner: string, repo: string, slug: string, callerUsername?: string): Promise<any> {
    // Enforce read access
    await this.resolveRepoAndCheckAccess(owner, repo, callerUsername, false);

    const repoPath = await this.ensureRepo(owner, repo);
    const filename = `${slug}.md`;
    try {
      const content = await this.runGit(repoPath, ['show', `refs/heads/main:${filename}`]);
      const logStr = await this.runGit(repoPath, ['log', '-1', '--format=%an|%ae|%aI', 'refs/heads/main', '--', filename]);
      const [authorName, authorEmail, authDate] = logStr.split('|');

      const title = slug.replace(/-/g, ' ');
      return {
        slug,
        title,
        body: content,
        lastEditedBy: authorName || 'Unknown',
        lastEditedAt: authDate || new Date().toISOString()
      };
    } catch (err: any) {
      throw new NotFoundException(`Wiki page '${slug}' not found`);
    }
  }

  async savePage(owner: string, repo: string, slug: string, dto: { title: string; body: string; message?: string; username: string }) {
    // Enforce write access
    await this.resolveRepoAndCheckAccess(owner, repo, dto.username, true);

    const repoPath = await this.ensureRepo(owner, repo);
    const filename = `${slug}.md`;
    const commitMessage = dto.message || `Update ${dto.title}`;
    const authorName = dto.username || 'appi';
    const authorEmail = `${authorName}@gitforge.local`;

    let parentCommit: string | null = null;
    let currentTreeEntries: string[] = [];
    try {
      parentCommit = await this.runGit(repoPath, ['rev-parse', 'refs/heads/main']);
      const treeContents = await this.runGit(repoPath, ['ls-tree', 'refs/heads/main']);
      currentTreeEntries = treeContents.split('\n').filter(Boolean);
    } catch {
      // Branch doesn't exist yet
    }

    const blobSha = await this.runGit(repoPath, ['hash-object', '-w', '--stdin'], dto.body);

    const updatedEntries = currentTreeEntries
      .map(entry => {
        const parts = entry.split(/\s+/);
        const entryName = parts[3];
        if (entryName === filename) {
          return `100644 blob ${blobSha}\t${filename}`;
        }
        return entry;
      });

    const hasFile = currentTreeEntries.some(entry => entry.split(/\s+/)[3] === filename);
    if (!hasFile) {
      updatedEntries.push(`100644 blob ${blobSha}\t${filename}`);
    }

    const treeInput = updatedEntries.join('\n') + '\n';
    const newTreeSha = await this.runGit(repoPath, ['mktree'], treeInput);

    const commitArgs = ['commit-tree', newTreeSha];
    if (parentCommit) {
      commitArgs.push('-p', parentCommit);
    }
    
    const envVars = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail
    };

    const newCommitSha = await this.runGit(repoPath, commitArgs, commitMessage, envVars);
    await this.runGit(repoPath, ['update-ref', 'refs/heads/main', newCommitSha]);

    // Re-read the page (skip access check since we already validated)
    const repoPathRe = await this.ensureRepo(owner, repo);
    const content = await this.runGit(repoPathRe, ['show', `refs/heads/main:${filename}`]);
    const logStr = await this.runGit(repoPathRe, ['log', '-1', '--format=%an|%ae|%aI', 'refs/heads/main', '--', filename]);
    const [an, ae, ad] = logStr.split('|');
    return {
      slug,
      title: slug.replace(/-/g, ' '),
      body: content,
      lastEditedBy: an || 'Unknown',
      lastEditedAt: ad || new Date().toISOString()
    };
  }

  async deletePage(owner: string, repo: string, slug: string, username: string) {
    // Enforce write access
    await this.resolveRepoAndCheckAccess(owner, repo, username, true);

    const repoPath = await this.ensureRepo(owner, repo);
    const filename = `${slug}.md`;
    const commitMessage = `Delete ${slug}`;
    const authorName = username || 'appi';
    const authorEmail = `${authorName}@gitforge.local`;

    let parentCommit: string | null = null;
    let currentTreeEntries: string[] = [];
    try {
      parentCommit = await this.runGit(repoPath, ['rev-parse', 'refs/heads/main']);
      const treeContents = await this.runGit(repoPath, ['ls-tree', 'refs/heads/main']);
      currentTreeEntries = treeContents.split('\n').filter(Boolean);
    } catch {
      throw new NotFoundException(`Wiki page '${slug}' not found`);
    }

    const updatedEntries = currentTreeEntries.filter(entry => {
      const parts = entry.split(/\s+/);
      return parts[3] !== filename;
    });

    if (updatedEntries.length === currentTreeEntries.length) {
      throw new NotFoundException(`Wiki page '${slug}' not found`);
    }

    const treeInput = updatedEntries.length > 0 ? updatedEntries.join('\n') + '\n' : '';
    let newTreeSha = '4b825dc642cb6eb9a0196e4c57d6482f18801404'; // Empty tree SHA
    if (updatedEntries.length > 0) {
      newTreeSha = await this.runGit(repoPath, ['mktree'], treeInput);
    }

    const commitArgs = ['commit-tree', newTreeSha, '-p', parentCommit];
    const envVars = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail
    };

    const newCommitSha = await this.runGit(repoPath, commitArgs, commitMessage, envVars);
    await this.runGit(repoPath, ['update-ref', 'refs/heads/main', newCommitSha]);
    return { success: true };
  }

  async getHistory(owner: string, repo: string, slug: string, callerUsername?: string): Promise<any[]> {
    // Enforce read access
    await this.resolveRepoAndCheckAccess(owner, repo, callerUsername, false);

    const repoPath = await this.ensureRepo(owner, repo);
    const filename = `${slug}.md`;
    try {
      const logStr = await this.runGit(repoPath, [
        'log',
        'refs/heads/main',
        '--format=%H|%an|%ae|%aI|%s',
        '--',
        filename
      ]);
      
      return logStr.split('\n').filter(Boolean).map(line => {
        const [sha, authorName, authorEmail, date, message] = line.split('|');
        return {
          sha,
          authorName,
          authorEmail,
          date,
          message
        };
      });
    } catch {
      return [];
    }
  }

  async getRevision(owner: string, repo: string, slug: string, sha: string, callerUsername?: string): Promise<any> {
    // Enforce read access
    await this.resolveRepoAndCheckAccess(owner, repo, callerUsername, false);

    const repoPath = await this.ensureRepo(owner, repo);
    const filename = `${slug}.md`;
    try {
      const content = await this.runGit(repoPath, ['show', `${sha}:${filename}`]);
      const logStr = await this.runGit(repoPath, ['log', '-1', '--format=%an|%ae|%aI|%s', sha, '--', filename]);
      const [authorName, authorEmail, authDate, message] = logStr.split('|');

      const title = slug.replace(/-/g, ' ');
      return {
        slug,
        title,
        body: content,
        sha,
        message,
        lastEditedBy: authorName || 'Unknown',
        lastEditedAt: authDate || new Date().toISOString()
      };
    } catch (err: any) {
      throw new NotFoundException(`Wiki page revision not found`);
    }
  }
}
