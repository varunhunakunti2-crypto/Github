import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '@gitforge/database';
import { SecretScannerService } from '../services/secret-scanner.service';
import { DependencyScannerService } from '../services/dependency-scanner.service';

@Controller('api/v1/internal')
export class InternalHooksController {
  constructor(
    private readonly secretScanner: SecretScannerService,
    private readonly dependencyScanner: DependencyScannerService
  ) {}

  private async getRepositoryFromPath(repoPath: string) {
    const normPath = repoPath.replace(/\\/g, '/');
    const parts = normPath.split('/');
    if (parts.length < 2) return null;

    const repoFileName = parts[parts.length - 1];
    const ownerName = parts[parts.length - 2];
    const repoName = repoFileName.replace(/\.git$/, '');

    return prisma.repository.findFirst({
      where: {
        name: repoName,
        OR: [
          { owner: { username: ownerName } },
          { organization: { slug: ownerName } }
        ]
      }
    });
  }

  @Post('pre-receive')
  async preReceive(@Body() payload: { repoPath: string; changes: Array<{ oldSha: string; newSha: string; refName: string }> }) {
    const repository = await this.getRepositoryFromPath(payload.repoPath);
    if (!repository) {
      // If repository not found in DB, let it pass (could be a temp repo)
      return { success: true };
    }

    let blockPush = false;
    let blockMessage = '';

    for (const change of payload.changes) {
      const result = await this.secretScanner.scanDiff(
        payload.repoPath,
        repository.id,
        change.oldSha,
        change.newSha
      );

      if (result.blocked) {
        blockPush = true;
        blockMessage += result.message || '';
      }
    }

    if (blockPush) {
      throw new HttpException(
        { message: blockMessage.trim() },
        HttpStatus.BAD_REQUEST
      );
    }

    return { success: true };
  }

  @Post('post-receive')
  async postReceive(@Body() payload: { repoPath: string; changes: Array<{ oldSha: string; newSha: string; refName: string }> }) {
    const repository = await this.getRepositoryFromPath(payload.repoPath);
    if (!repository) return { success: true };

    for (const change of payload.changes) {
      // Trigger Dependency Scanning on every push ref updates
      if (change.newSha && change.newSha !== '0000000000000000000000000000000000000000') {
        this.dependencyScanner.scanRepo(payload.repoPath, repository.id, change.newSha)
          .catch(err => console.error('[HOOKS] Dependency scan failed:', err));
      }
    }

    return { success: true };
  }
}
