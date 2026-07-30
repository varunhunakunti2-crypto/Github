import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { Readable } from "stream";

const execFileAsync = promisify(execFile);

@Injectable()
export class ReleaseService {
  private getRepoPath(owner: string, repo: string): string {
    const basePath = process.env.GIT_DATA_PATH || path.resolve(process.cwd(), 'git-daemon', 'data', 'repos');
    return path.join(basePath, owner, `${repo}.git`);
  }

  private async runGit(repoPath: string, args: string[], env: Record<string, string> = {}): Promise<string> {
    const secureEnv = { ...process.env, ...env };
    try {
      const { stdout } = await execFileAsync('git', args, { cwd: repoPath, env: secureEnv });
      return stdout.trim();
    } catch (err: any) {
      throw new BadRequestException(err.stderr?.trim() || err.message);
    }
  }

  /**
   * Helper to verify repository visibility and user read access.
   */
  private async checkReadAccess(owner: string, repo: string, username?: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    if (repository.isPrivate) {
      if (!username) {
        throw new NotFoundException('Repository not found');
      }
      const isOwner = repository.ownerId === username || owner === username;
      if (!isOwner) {
        throw new NotFoundException('Repository not found');
      }
    }
    return repository;
  }

  /**
   * Helper to verify user write access to repository.
   */
  private async checkWriteAccess(owner: string, repo: string, username?: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    if (!username) {
      throw new ForbiddenException('Authentication required');
    }
    const isOwner = repository.ownerId === username || owner === username;
    if (!isOwner) {
      throw new ForbiddenException('Write access required');
    }
    return repository;
  }

  async listReleases(owner: string, repo: string, username?: string) {
    const repository = await this.checkReadAccess(owner, repo, username);
    const isOwner = username && (repository.ownerId === username || owner === username);

    return prisma.release.findMany({
      where: {
        repositoryId: repository.id,
        // Hide drafts from non-owners
        ...(isOwner ? {} : { isDraft: false })
      },
      include: {
        author: {
          select: { username: true, avatarUrl: true }
        },
        assets: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });
  }

  async findOne(owner: string, repo: string, id: string, username?: string) {
    const repository = await this.checkReadAccess(owner, repo, username);
    const release = await prisma.release.findFirst({
      where: { id, repositoryId: repository.id },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        assets: true
      }
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Hide draft if user is not owner
    if (release.isDraft) {
      const isOwner = username && (repository.ownerId === username || owner === username);
      if (!isOwner) {
        throw new NotFoundException('Release not found');
      }
    }

    return release;
  }

  async findByTag(owner: string, repo: string, tag: string, username?: string) {
    const repository = await this.checkReadAccess(owner, repo, username);
    const release = await prisma.release.findFirst({
      where: { tagName: tag, repositoryId: repository.id },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        assets: true
      }
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.isDraft) {
      const isOwner = username && (repository.ownerId === username || owner === username);
      if (!isOwner) {
        throw new NotFoundException('Release not found');
      }
    }

    return release;
  }

  async createRelease(
    owner: string,
    repo: string,
    username: string,
    dto: {
      tagName: string;
      targetCommitSha?: string;
      title?: string;
      bodyMarkdown: string;
      isPrerelease: boolean;
      isDraft: boolean;
    }
  ) {
    const repository = await this.checkWriteAccess(owner, repo, username);
    const repoPath = this.getRepoPath(owner, repo);

    // Validate tag name against git naming rules if creating a new one
    // Simple validation (clean regex or git check-ref-format)
    const validTagName = /^[a-zA-Z0-9_\-\.\/]+$/.test(dto.tagName);
    if (!validTagName) {
      throw new BadRequestException('Invalid tag name format');
    }

    const targetSha = dto.targetCommitSha || 'main';

    let resolvedSha = '';
    try {
      resolvedSha = await this.runGit(repoPath, ['rev-parse', targetSha]);
    } catch {
      throw new BadRequestException(`Could not resolve target ref/commit: ${targetSha}`);
    }

    const releaseTitle = dto.title || dto.tagName;

    // Create the annotated git tag if NOT a draft
    if (!dto.isDraft) {
      try {
        await this.runGit(repoPath, [
          'tag',
          '-a',
          dto.tagName,
          resolvedSha,
          '-m',
          releaseTitle
        ], {
          GIT_AUTHOR_NAME: username,
          GIT_AUTHOR_EMAIL: `${username}@gitforge.local`,
          GIT_COMMITTER_NAME: username,
          GIT_COMMITTER_EMAIL: `${username}@gitforge.local`
        });
      } catch (err: any) {
        // Tag might already exist
        if (err.message.includes('already exists')) {
          // If the tag exists, verify if we can reuse it
          console.log(`Reusing existing tag ${dto.tagName}`);
        } else {
          throw new BadRequestException(`Failed to create annotated Git tag: ${err.message}`);
        }
      }
    }

    // Save to database
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    return prisma.release.create({
      data: {
        tagName: dto.tagName,
        targetCommitSha: resolvedSha,
        title: releaseTitle,
        bodyMarkdown: dto.bodyMarkdown,
        isPrerelease: dto.isPrerelease,
        isDraft: dto.isDraft,
        authorId: user.id,
        repositoryId: repository.id,
        publishedAt: dto.isDraft ? null : new Date()
      },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        assets: true
      }
    });
  }

  async updateRelease(
    owner: string,
    repo: string,
    id: string,
    username: string,
    dto: {
      title?: string;
      bodyMarkdown?: string;
      isPrerelease?: boolean;
      isDraft?: boolean;
    }
  ) {
    const repository = await this.checkWriteAccess(owner, repo, username);
    const release = await prisma.release.findFirst({
      where: { id, repositoryId: repository.id }
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const wasDraft = release.isDraft;
    const isNowDraft = dto.isDraft !== undefined ? dto.isDraft : release.isDraft;

    // If publishing a draft (wasDraft -> isNowDraft is false)
    if (wasDraft && !isNowDraft) {
      const repoPath = this.getRepoPath(owner, repo);
      const releaseTitle = dto.title || release.title;
      try {
        await this.runGit(repoPath, [
          'tag',
          '-a',
          release.tagName,
          release.targetCommitSha,
          '-m',
          releaseTitle
        ], {
          GIT_AUTHOR_NAME: username,
          GIT_AUTHOR_EMAIL: `${username}@gitforge.local`,
          GIT_COMMITTER_NAME: username,
          GIT_COMMITTER_EMAIL: `${username}@gitforge.local`
        });
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          throw new BadRequestException(`Failed to create annotated Git tag on publish: ${err.message}`);
        }
      }
    }

    return prisma.release.update({
      where: { id },
      data: {
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        isPrerelease: dto.isPrerelease,
        isDraft: isNowDraft,
        publishedAt: wasDraft && !isNowDraft ? new Date() : undefined
      },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        assets: true
      }
    });
  }

  async deleteRelease(owner: string, repo: string, id: string, username: string, deleteTag: boolean) {
    const repository = await this.checkWriteAccess(owner, repo, username);
    const release = await prisma.release.findFirst({
      where: { id, repositoryId: repository.id }
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Delete release assets from storage service mock
    const assets = await prisma.releaseAsset.findMany({ where: { releaseId: id } });
    const storagePath = path.resolve(process.cwd(), 'git-daemon', 'data', 'uploads');
    for (const asset of assets) {
      const filePath = path.join(storagePath, path.basename(asset.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
    }

    // Delete database records
    await prisma.release.delete({ where: { id } });

    // Conditionally delete the underlying Git tag
    if (deleteTag && !release.isDraft) {
      const repoPath = this.getRepoPath(owner, repo);
      try {
        await this.runGit(repoPath, ['tag', '-d', release.tagName]);
      } catch (err: any) {
        console.warn(`Tag ${release.tagName} could not be deleted from Git: ${err.message}`);
      }
    }

    return { success: true };
  }

  async autoGenerateNotes(owner: string, repo: string, tagName: string, username?: string) {
    await this.checkReadAccess(owner, repo, username);
    const repoPath = this.getRepoPath(owner, repo);

    // Find latest release tag before this one
    const tagsStr = await this.runGit(repoPath, ['tag', '--sort=-creatordate']);
    const tags = tagsStr.split('\n').filter(Boolean);

    let prevTag = '';
    // Find index of current tagName to look at the next oldest tag
    const idx = tags.indexOf(tagName);
    if (idx !== -1 && idx + 1 < tags.length) {
      prevTag = tags[idx + 1];
    } else if (tags.length > 0 && tags[0] !== tagName) {
      prevTag = tags[0];
    }

    let commits: string[] = [];
    try {
      const logRange = prevTag ? `${prevTag}..HEAD` : 'HEAD';
      const commitsStr = await this.runGit(repoPath, ['log', logRange, '--oneline']);
      commits = commitsStr.split('\n').filter(Boolean);
    } catch {
      // Fallback
    }

    // Group commits by Conventional Commit Type
    const feat: string[] = [];
    const fix: string[] = [];
    const docs: string[] = [];
    const chore: string[] = [];
    const other: string[] = [];

    for (const commit of commits) {
      // commits are in form: "<sha> <message>"
      const message = commit.substring(commit.indexOf(' ') + 1);
      const lower = message.toLowerCase();
      if (lower.startsWith('feat:') || lower.startsWith('feat(')) {
        feat.push(message);
      } else if (lower.startsWith('fix:') || lower.startsWith('fix(')) {
        fix.push(message);
      } else if (lower.startsWith('docs:') || lower.startsWith('docs(')) {
        docs.push(message);
      } else if (lower.startsWith('chore:') || lower.startsWith('chore(')) {
        chore.push(message);
      } else {
        other.push(message);
      }
    }

    let changelog = `## Changelog\n\n`;
    if (feat.length > 0) {
      changelog += `### 🚀 Features\n` + feat.map(m => `- ${m}`).join('\n') + '\n\n';
    }
    if (fix.length > 0) {
      changelog += `### 🐛 Bug Fixes\n` + fix.map(m => `- ${m}`).join('\n') + '\n\n';
    }
    if (docs.length > 0) {
      changelog += `### 📖 Documentation\n` + docs.map(m => `- ${m}`).join('\n') + '\n\n';
    }
    if (chore.length > 0) {
      changelog += `### ⚙️ Chores\n` + chore.map(m => `- ${m}`).join('\n') + '\n\n';
    }
    if (other.length > 0) {
      changelog += `### 📦 Other Changes\n` + other.map(m => `- ${m}`).join('\n') + '\n\n';
    }

    if (commits.length === 0) {
      changelog += `No commits recorded since last release.`;
    }

    return { changelog };
  }

  async addAsset(owner: string, repo: string, releaseId: string, username: string, file: Express.Multer.File) {
    const repository = await this.checkWriteAccess(owner, repo, username);
    const release = await prisma.release.findFirst({
      where: { id: releaseId, repositoryId: repository.id }
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Storage uploads path
    const uploadDir = path.resolve(process.cwd(), 'git-daemon', 'data', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // In a real app we upload using StorageService. We write to file here to simulate local storage.
    const fileUrl = `/api/v1/repositories/${owner}/${repo}/releases/assets/download/${file.filename}`;

    return prisma.releaseAsset.create({
      data: {
        fileName: file.originalname,
        fileUrl: fileUrl,
        sizeBytes: file.size,
        releaseId: release.id
      }
    });
  }

  async deleteAsset(owner: string, repo: string, assetId: string, username: string) {
    await this.checkWriteAccess(owner, repo, username);
    const asset = await prisma.releaseAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const uploadDir = path.resolve(process.cwd(), 'git-daemon', 'data', 'uploads');
    const filePath = path.join(uploadDir, path.basename(asset.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    await prisma.releaseAsset.delete({ where: { id: assetId } });
    return { success: true };
  }

  async getArchiveStream(owner: string, repo: string, tag: string, format: 'zip' | 'tar.gz', username?: string) {
    await this.checkReadAccess(owner, repo, username);
    const repoPath = this.getRepoPath(owner, repo);

    // Run git archive tree at the tag and return a Readable stream
    const { spawn } = require('child_process');
    const gitFormat = format === 'zip' ? 'zip' : 'tar.gz';
    
    // spawn runs child command without blocking node memory
    const cp = spawn('git', ['archive', `--format=${gitFormat}`, tag], { cwd: repoPath });
    
    return {
      stream: cp.stdout as Readable,
      stderr: cp.stderr as Readable
    };
  }
}
