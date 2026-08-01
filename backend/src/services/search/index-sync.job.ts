import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

@Injectable()
export class IndexSyncJob {
  private readonly logger = new Logger(IndexSyncJob.name);
  private readonly basePath = process.env.GIT_DATA_PATH || path.resolve(process.cwd(), "git-daemon", "data", "repos");

  async syncAllRepositories() {
    this.logger.log("Starting repository code search indexing job...");
    try {
      const repos = await prisma.repository.findMany({
        include: {
          owner: { select: { username: true } },
          organization: { select: { slug: true } }
        }
      });

      for (const repo of repos) {
        await this.syncRepository(repo);
      }
      this.logger.log("Repository indexing job completed.");
    } catch (e: any) {
      this.logger.error("Failed to index repositories", e.stack);
    }
  }

  async syncRepository(repo: any) {
    const ownerSlug = repo.organization ? repo.organization.slug : repo.owner?.username;
    if (!ownerSlug) {
      this.logger.warn(`Skip indexing repository ${repo.name}: no owner/org associated.`);
      return;
    }

    const repoPath = path.join(this.basePath, ownerSlug, `${repo.name}.git`);
    if (!fs.existsSync(repoPath)) {
      this.logger.warn(`Skip indexing repository ${repo.name}: path ${repoPath} does not exist on disk.`);
      return;
    }

    this.logger.log(`Indexing repository: ${ownerSlug}/${repo.name}`);
    try {
      // 1. Get files list on HEAD
      const filesOutput = await this.runGit(repoPath, ["ls-tree", "-r", "--name-only", "HEAD"]);
      const files = filesOutput.split("\n").map(f => f.trim()).filter(f => f.length > 0);

      // Binary/Ignored extensions
      const ignoredExtensions = [
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".gz", ".tar",
        ".mp4", ".mp3", ".woff", ".woff2", ".ttf", ".eot", ".svg", ".map",
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
      ];

      // 2. Clear old indexes for this repo
      await prisma.codeSearchIndex.deleteMany({
        where: { repositoryId: repo.id }
      });

      // 3. Extract contents and insert
      for (const filePath of files) {
        const ext = path.extname(filePath).toLowerCase();
        const baseName = path.basename(filePath);
        if (ignoredExtensions.includes(ext) || ignoredExtensions.includes(baseName)) {
          continue;
        }

        try {
          const content = await this.runGit(repoPath, ["show", `HEAD:${filePath}`]);
          
          // Excerpt: store first 32KB of content
          const contentExcerpt = content.slice(0, 32768);

          await prisma.codeSearchIndex.create({
            data: {
              repositoryId: repo.id,
              filePath,
              contentExcerpt
            }
          });
        } catch (fileErr: any) {
          this.logger.warn(`Could not index file ${filePath} in ${repo.name}: ${fileErr.message}`);
        }
      }
      this.logger.log(`Successfully indexed ${repo.name}.`);
    } catch (err: any) {
      this.logger.error(`Error indexing repository ${ownerSlug}/${repo.name}: ${err.message}`);
    }
  }

  private async runGit(repoPath: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 });
      return stdout;
    } catch (err: any) {
      throw new Error(`Git error: ${err.message}`);
    }
  }
}
