import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { GitCommandRunner, GitCommandError } from '../utils/git-command-runner';
import { CommitDto, BranchDto, FileNodeDto, DiffFileDto, CreateBranchDto, CommitChangeDto } from '../dto/git.dto';
import * as fs from 'fs';

@Injectable()
export class GitOperationsService {
  private readonly dataBasePath = process.env.GIT_DATA_PATH || path.join(process.cwd(), 'data', 'repos');

  private getRepoPath(owner: string, repo: string): string {
    return GitCommandRunner.buildRepoPath(this.dataBasePath, owner, repo);
  }

  private handleGitError(err: any, context: string): never {
    if (err instanceof GitCommandError) {
      if (err.stderr.includes('fatal: not a valid object name')) {
        throw new BadRequestException(`Invalid reference provided for ${context}`);
      }
      throw new InternalServerErrorException(`Git error during ${context}: ${err.stderr || err.message}`);
    }
    throw err;
  }

  /**
   * Commit Operations
   */
  async getCommitLog(owner: string, repo: string, ref: string = 'HEAD', maxCount: number = 50, filePath: string = ''): Promise<CommitDto[]> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      // Format: hash|authorName|authorEmail|date|message|parents|signatureStatus
      const format = '%H|%an|%ae|%aI|%s|%P|%G?';
      const args = [
        'log',
        `--max-count=${maxCount}`,
        `--format=${format}`,
        ref
      ];
      if (filePath) {
        args.push('--', filePath);
      }
      
      const { stdout } = await GitCommandRunner.execute(args, { cwd: repoPath });

      if (!stdout.trim()) return [];

      return stdout.trim().split('\n').map(line => {
        const [hash, authorName, authorEmail, date, message, parentsStr, signatureStatus] = line.split('|');
        return {
          hash,
          authorName,
          authorEmail,
          date,
          message,
          parents: parentsStr ? parentsStr.split(' ') : [],
          signatureStatus: signatureStatus || 'N',
        };
      });
    } catch (err: any) {
      // Empty repo has no commits
      if (err.stderr && err.stderr.includes('does not have any commits yet')) {
        return [];
      }
      this.handleGitError(err, 'getCommitLog');
    }
  }

  /**
   * Branch Operations
   */
  async getBranches(owner: string, repo: string): Promise<any[]> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      let defaultBranch = 'main';
      try {
        const { stdout: symRef } = await GitCommandRunner.execute(['symbolic-ref', '--short', 'HEAD'], { cwd: repoPath });
        defaultBranch = symRef.trim();
      } catch (e) {}

      const { stdout } = await GitCommandRunner.execute([
        'for-each-ref',
        '--format=%(refname:short) %(objectname)',
        'refs/heads/'
      ], { cwd: repoPath });

      if (!stdout.trim()) return [];

      const branchLines = stdout.trim().split('\n');
      const branches = [];

      for (const line of branchLines) {
        const [name, hash] = line.split(' ');
        
        let lastCommitMessage = '';
        let lastCommitDate = '';
        let authorName = '';
        let authorEmail = '';
        
        try {
          const { stdout: logOut } = await GitCommandRunner.execute(['log', '-1', '--format=%s|%aI|%an|%ae', name], { cwd: repoPath });
          if (logOut.trim()) {
            const parts = logOut.trim().split('|');
            lastCommitMessage = parts[0] || '';
            lastCommitDate = parts[1] || '';
            authorName = parts[2] || '';
            authorEmail = parts[3] || '';
          }
        } catch (e) {}

        let ahead = 0;
        let behind = 0;
        if (name !== defaultBranch) {
          try {
            const { stdout: aheadOut } = await GitCommandRunner.execute(['rev-list', '--count', `${defaultBranch}..${name}`], { cwd: repoPath });
            const { stdout: behindOut } = await GitCommandRunner.execute(['rev-list', '--count', `${name}..${defaultBranch}`], { cwd: repoPath });
            ahead = parseInt(aheadOut.trim(), 10) || 0;
            behind = parseInt(behindOut.trim(), 10) || 0;
          } catch (e) {}
        }

        branches.push({
          name,
          hash,
          isDefault: name === defaultBranch,
          lastCommitMessage,
          lastCommitDate,
          authorName,
          authorEmail,
          ahead,
          behind,
        });
      }

      return branches;
    } catch (err) {
      this.handleGitError(err, 'getBranches');
    }
  }

  /**
   * File Operations
   */
  async getTree(owner: string, repo: string, ref: string = 'HEAD', dirPath: string = ''): Promise<FileNodeDto[]> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      // Use ls-tree to list contents
      const args = ['ls-tree', ref];
      if (dirPath) {
        args.push(`${dirPath}/`);
      }
      const { stdout } = await GitCommandRunner.execute(args, { cwd: repoPath });

      if (!stdout.trim()) return [];

      const entries = stdout.trim().split('\n').map(line => {
        // Format: <mode> SP <type> SP <object> TAB <file>
        const [meta, filePath] = line.split('\t');
        const [mode, type, hash] = meta.split(' ');
        return {
          mode,
          type: type as 'blob' | 'tree' | 'commit',
          hash,
          path: filePath,
          name: filePath.split('/').pop() || ''
        } as FileNodeDto;
      });

      // SHORTCUT TAKEN: N subprocess calls instead of a single `git log --name-status` walk.
      // TRADEOFF: Walking history backward and tracking tree state/renames until all current
      // entries are satisfied is complex and computationally expensive to implement in JS.
      // For a production system (like Gitaly), this is written in Go/C. 
      // Using Promise.all with `git log -1` is O(N) subprocesses but much simpler.
      await Promise.all(entries.map(async (entry) => {
        try {
          const logArgs = ['log', '-1', '--format=%H|%s|%aI', ref, '--', entry.path];
          const logRes = await GitCommandRunner.execute(logArgs, { cwd: repoPath });
          if (logRes.stdout.trim()) {
            const [hash, msg, date] = logRes.stdout.trim().split('|');
            entry.lastCommitHash = hash;
            entry.lastCommitMessage = msg;
            entry.lastCommitDate = date;
          }
        } catch (e) {
          // ignore if history fetch fails for one file
        }
      }));

      // Sort folders before files, then alphabetical
      entries.sort((a, b) => {
        if (a.type === 'tree' && b.type !== 'tree') return -1;
        if (a.type !== 'tree' && b.type === 'tree') return 1;
        return a.name.localeCompare(b.name);
      });

      return entries;
    } catch (err) {
      this.handleGitError(err, 'getTree');
    }
  }

  async getBlobContent(owner: string, repo: string, hash: string): Promise<string> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      const { stdout } = await GitCommandRunner.execute([
        'cat-file',
        '-p',
        hash
      ], { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 }); // 10MB limit for text viewing
      return stdout;
    } catch (err) {
      this.handleGitError(err, 'getBlobContent');
    }
  }

  /**
   * Diff Engine
   */
  async getDiff(owner: string, repo: string, baseRef: string, headRef: string): Promise<DiffFileDto[]> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      const { stdout } = await GitCommandRunner.execute([
        'diff',
        '--name-status',
        baseRef,
        headRef
      ], { cwd: repoPath });

      if (!stdout.trim()) return [];

      return stdout.trim().split('\n').map(line => {
        const [statusStr, path] = line.split('\t');
        let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
        if (statusStr.startsWith('A')) status = 'added';
        if (statusStr.startsWith('D')) status = 'deleted';
        if (statusStr.startsWith('R')) status = 'renamed';
        
        return {
          oldPath: path,
          newPath: path,
          status,
          hunks: []
        };
      });
    } catch (err) {
      this.handleGitError(err, 'getDiff');
    }
  }

  async compare(owner: string, repo: string, base: string, head: string): Promise<any> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      const format = '%H|%an|%ae|%aI|%s|%P';
      const logArgs = ['log', `--format=${format}`, `${base}..${head}`];
      let commits: any[] = [];
      try {
        const { stdout } = await GitCommandRunner.execute(logArgs, { cwd: repoPath });
        if (stdout.trim()) {
          commits = stdout.trim().split('\n').map(line => {
            const [hash, authorName, authorEmail, date, message, parentsStr] = line.split('|');
            return {
              hash,
              authorName,
              authorEmail,
              date,
              message,
              parents: parentsStr ? parentsStr.split(' ') : [],
            };
          });
        }
      } catch (e) {}

      const diff = await this.getDiff(owner, repo, base, head);

      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: aheadOut } = await GitCommandRunner.execute(['rev-list', '--count', `${base}..${head}`], { cwd: repoPath });
        const { stdout: behindOut } = await GitCommandRunner.execute(['rev-list', '--count', `${head}..${base}`], { cwd: repoPath });
        ahead = parseInt(aheadOut.trim(), 10) || 0;
        behind = parseInt(behindOut.trim(), 10) || 0;
      } catch (e) {}

      return {
        commits,
        diff,
        ahead,
        behind
      };
    } catch (err) {
      this.handleGitError(err, 'compare');
    }
  }

  async getCommitDetail(owner: string, repo: string, sha: string): Promise<any> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      const format = '%H|%an|%ae|%aI|%cn|%ce|%cI|%s|%P|%G?';
      const { stdout: metaOut } = await GitCommandRunner.execute(['log', '-1', `--format=${format}`, sha], { cwd: repoPath });
      
      const [hash, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate, subject, parentsStr, gpg] = metaOut.trim().split('|');
      
      const { stdout: bodyOut } = await GitCommandRunner.execute(['log', '-1', '--format=%B', sha], { cwd: repoPath });
      const fullMessage = bodyOut.trim();

      const { stdout: numstatOut } = await GitCommandRunner.execute(['show', '--numstat', '--format=', sha], { cwd: repoPath });
      const numstatLines = numstatOut.trim().split('\n').filter(Boolean);

      const { stdout: nameStatusOut } = await GitCommandRunner.execute(['show', '--name-status', '--format=', sha], { cwd: repoPath });
      const nameStatusLines = nameStatusOut.trim().split('\n').filter(Boolean);

      const files = numstatLines.map((line, idx) => {
        const parts = line.split('\t');
        const addedStr = parts[0] || '0';
        const deletedStr = parts[1] || '0';
        const path = parts[2] || '';

        const statusLine = nameStatusLines[idx] || '';
        const statusParts = statusLine.split('\t');
        const statusStr = statusParts[0] || 'M';
        const oldPath = statusParts[1] || '';
        const newPath = statusParts[2] || '';
        
        let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
        if (statusStr.startsWith('A')) status = 'added';
        if (statusStr.startsWith('D')) status = 'deleted';
        if (statusStr.startsWith('R')) status = 'renamed';

        return {
          path: status === 'renamed' ? newPath : path,
          oldPath: status === 'renamed' ? oldPath : undefined,
          status,
          additions: parseInt(addedStr, 10) || 0,
          deletions: parseInt(deletedStr, 10) || 0
        };
      });

      return {
        hash,
        authorName,
        authorEmail,
        authorDate,
        committerName,
        committerEmail,
        committerDate,
        subject,
        fullMessage,
        parents: parentsStr ? parentsStr.split(' ') : [],
        gpg: gpg || 'N',
        files
      };
    } catch (err) {
      this.handleGitError(err, 'getCommitDetail');
    }
  }

  /**
   * Mutation Operations
   */
  async createBranch(owner: string, repo: string, dto: CreateBranchDto): Promise<void> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      await GitCommandRunner.execute([
        'branch',
        dto.name,
        dto.fromRef
      ], { cwd: repoPath });
    } catch (err) {
      this.handleGitError(err, 'createBranch');
    }
  }

  async deleteBranch(owner: string, repo: string, name: string): Promise<void> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      await GitCommandRunner.execute([
        'branch',
        '-D', // Force delete
        name
      ], { cwd: repoPath });
    } catch (err) {
      this.handleGitError(err, 'deleteBranch');
    }
  }

  async performMerge(
    owner: string,
    repo: string,
    base: string,
    head: string,
    strategy: 'merge' | 'squash' | 'rebase' = 'merge',
    message?: string
  ): Promise<any> {
    const repoPath = this.getRepoPath(owner, repo);
    try {
      const { stdout: baseSha } = await GitCommandRunner.execute(['rev-parse', base], { cwd: repoPath });
      const { stdout: headSha } = await GitCommandRunner.execute(['rev-parse', head], { cwd: repoPath });

      try {
        const { stdout: mergeOut } = await GitCommandRunner.execute([
          'merge-tree',
          '--write-tree',
          baseSha.trim(),
          headSha.trim()
        ], { cwd: repoPath });

        const mergedTreeSha = mergeOut.trim().split('\n')[0];

        // Create merge commit
        const commitArgs = ['commit-tree', mergedTreeSha, '-p', baseSha.trim(), '-p', headSha.trim()];
        commitArgs.push('-m', message || `Merge branch '${head}' into '${base}'`);

        const { stdout: commitSha } = await GitCommandRunner.execute(commitArgs, { cwd: repoPath });

        // Update target branch ref
        await GitCommandRunner.execute(['update-ref', `refs/heads/${base}`, commitSha.trim()], { cwd: repoPath });

        return { success: true, commitSha: commitSha.trim() };
      } catch (err: any) {
        return {
          success: false,
          conflicts: true,
          message: 'Conflicts occurred during merge. Conflict resolution editor is required.'
        };
      }
    } catch (err) {
      this.handleGitError(err, 'performMerge');
    }
  }

  async commitFile(owner: string, repo: string, user: { username: string, email?: string }, dto: CommitChangeDto): Promise<string> {
    const repoPath = this.getRepoPath(owner, repo);
    const tempIndex = path.join(repoPath, `index-${Date.now()}`);

    try {
      // 1. Resolve current HEAD SHA of target branch
      let parentSha = '';
      let branchExists = false;
      try {
        const { stdout } = await GitCommandRunner.execute(['rev-parse', dto.branch], { cwd: repoPath });
        parentSha = stdout.trim();
        branchExists = true;
      } catch (e) {
        // Branch doesn't exist yet, we start fresh
      }

      // Check optimistic concurrency
      if (dto.expectedParentSha && branchExists) {
        if (parentSha !== dto.expectedParentSha) {
          throw new BadRequestException('Optimistic concurrency failure: Branch has been updated.');
        }
      }

      // 2. Populate temporary index
      if (branchExists) {
        await GitCommandRunner.execute(['read-tree', dto.branch], { 
          cwd: repoPath,
          env: { ...process.env, GIT_INDEX_FILE: tempIndex }
        });
      }

      // 3. Process each file in the commit request
      let indexInfo = '';
      for (const file of dto.files) {
        // If file content is empty/missing, remove the file from the index (deletion)
        if (!file.content) {
          indexInfo += `0 0000000000000000000000000000000000000000\t${file.path}\n`;
        } else {
          // Write blob
          const fileBuffer = file.encoding === 'base64' 
            ? Buffer.from(file.content, 'base64') 
            : Buffer.from(file.content, 'utf-8');
          
          const tempFile = path.join(repoPath, `temp-blob-${Date.now()}`);
          fs.writeFileSync(tempFile, fileBuffer);

          try {
            const { stdout: blobSha } = await GitCommandRunner.execute(['hash-object', '-w', tempFile], { cwd: repoPath });
            // Add to index info
            indexInfo += `100644 ${blobSha.trim()}\t${file.path}\n`;
          } finally {
            if (fs.existsSync(tempFile)) {
              try { fs.unlinkSync(tempFile); } catch (e) {}
            }
          }
        }
      }

      if (indexInfo) {
        await GitCommandRunner.executeWithStdin(['update-index', '--index-info'], indexInfo, {
          cwd: repoPath,
          env: { ...process.env, GIT_INDEX_FILE: tempIndex }
        });
      }

      // 4. Write tree
      const { stdout: treeSha } = await GitCommandRunner.execute(['write-tree'], {
        cwd: repoPath,
        env: { ...process.env, GIT_INDEX_FILE: tempIndex }
      });

      // 5. Create commit
      const commitArgs = ['commit-tree', treeSha.trim()];
      if (branchExists) {
        commitArgs.push('-p', parentSha);
      }
      commitArgs.push('-m', dto.message);

      const email = user.email || `${user.username}@gitforge.local`;
      const { stdout: commitSha } = await GitCommandRunner.execute(commitArgs, {
        cwd: repoPath,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: user.username,
          GIT_AUTHOR_EMAIL: email,
          GIT_COMMITTER_NAME: user.username,
          GIT_COMMITTER_EMAIL: email
        }
      });

      // 6. Update reference
      const updateRefArgs = ['update-ref', `refs/heads/${dto.branch}`, commitSha.trim()];
      if (branchExists) {
        updateRefArgs.push(parentSha);
      }
      await GitCommandRunner.execute(updateRefArgs, { cwd: repoPath });

      return commitSha.trim();
    } catch (err) {
      this.handleGitError(err, 'commitFile');
    } finally {
      if (fs.existsSync(tempIndex)) {
        try { fs.unlinkSync(tempIndex); } catch (e) {}
      }
    }
  }
}
