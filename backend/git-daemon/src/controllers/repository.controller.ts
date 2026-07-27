import { Controller, Get, Post, Delete, Body, Param, Query, Req, Res, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { GitOperationsService } from '../services/git-operations.service';
import { RepoInitService } from '../services/repo-init.service';
import { AuthService } from '../services/auth.service';
import { CreateBranchDto, CommitChangeDto } from '../dto/git.dto';

@Controller('api/v1/repos')
export class RepositoryController {
  constructor(
    private readonly gitOps: GitOperationsService,
    private readonly repoInit: RepoInitService,
    private readonly authService: AuthService
  ) {}

  private async authorize(owner: string, repo: string, req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const user = await this.authService.authenticateHeader(authHeader);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'read');
    return user;
  }

  @Post(':owner/:repo/init')
  async initRepo(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request
  ) {
    const user = await this.authorize(owner, repo, req);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'write');
    return this.repoInit.initBareRepo(owner, repo);
  }

  @Get(':owner/:repo/commits')
  async getCommits(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('ref') ref: string = 'HEAD',
    @Query('maxCount') maxCount: string = '50',
    @Query('path') path: string = '',
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    const count = parseInt(maxCount, 10);
    return this.gitOps.getCommitLog(owner, repo, ref, isNaN(count) ? 50 : count, path);
  }

  @Get(':owner/:repo/commits/:sha')
  async getCommitDetail(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('sha') sha: string,
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    return this.gitOps.getCommitDetail(owner, repo, sha);
  }

  @Get(':owner/:repo/branches')
  async getBranches(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    return this.gitOps.getBranches(owner, repo);
  }

  @Get(':owner/:repo/tree')
  async getTree(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('ref') ref: string = 'HEAD',
    @Query('path') dirPath: string = '',
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    return this.gitOps.getTree(owner, repo, ref, dirPath);
  }

  @Get(':owner/:repo/blob/:hash')
  async getBlob(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('hash') hash: string,
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    const content = await this.gitOps.getBlobContent(owner, repo, hash);
    return { content };
  }

  @Get(':owner/:repo/raw/:ref/*')
  async getRaw(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('ref') ref: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Note: A real implementation should ideally use a separate subdomain or strict CSP.
    // Here we use strict nosniff and attachment headers for security.
    await this.authorize(owner, repo, req);
    
    // In Express, wildcard is accessed via req.params[0]
    const filePath = req.params[0];

    // Convert path to the ref:path syntax git expects
    // We first need to resolve the blob hash using `git ls-tree` or just `git show` directly.
    try {
      // In GitOperationsService, we can create a `streamFile` or just use `getBlobContent` 
      // if we pass `ref:path` instead of `hash`. The `cat-file -p` command works with `ref:path` too!
      const content = await this.gitOps.getBlobContent(owner, repo, `${ref}:${filePath}`);
      
      const ext = filePath.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      let disposition = 'attachment'; // default secure

      // Safe inline types
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
        contentType = `image/${ext}`;
        disposition = 'inline';
      } else if (['md', 'txt', 'csv', 'json', 'ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
        contentType = 'text/plain; charset=utf-8'; // strictly text/plain to prevent XSS
        disposition = 'inline';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none';");
      res.setHeader('Content-Disposition', `${disposition}; filename="${filePath.split('/').pop()}"`);
      
      res.send(content);
    } catch (err: any) {
      if (err.message?.includes('fatal: not a valid object name')) {
        res.status(HttpStatus.NOT_FOUND).send('Not Found');
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
      }
    }
  }

  @Get(':owner/:repo/diff')
  async getDiff(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('base') baseRef: string,
    @Query('head') headRef: string,
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    return this.gitOps.getDiff(owner, repo, baseRef, headRef);
  }

  @Post(':owner/:repo/branches')
  async createBranch(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() dto: CreateBranchDto,
    @Req() req: Request
  ) {
    // Requires write access to create branch
    const user = await this.authorize(owner, repo, req);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'write');
    await this.gitOps.createBranch(owner, repo, dto);
    return { success: true };
  }

  @Post(':owner/:repo/commits')
  async commitChange(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() dto: CommitChangeDto,
    @Req() req: Request
  ) {
    const user = await this.authorize(owner, repo, req);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'write');
    const hash = await this.gitOps.commitFile(owner, repo, user, dto);
    return { success: true, hash };
  }

  @Delete(':owner/:repo/branches/:branch')
  async deleteBranch(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('branch') branch: string,
    @Req() req: Request
  ) {
    const user = await this.authorize(owner, repo, req);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'write');
    await this.gitOps.deleteBranch(owner, repo, branch);
    return { success: true };
  }

  @Get(':owner/:repo/compare/:baseHead')
  async compare(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('baseHead') baseHead: string,
    @Req() req: Request
  ) {
    await this.authorize(owner, repo, req);
    const [base, head] = baseHead.split('...');
    if (!base || !head) {
      throw new HttpException('Invalid comparison format. Use base...head', HttpStatus.BAD_REQUEST);
    }
    return this.gitOps.compare(owner, repo, base, head);
  }

  @Post(':owner/:repo/merge')
  async performMerge(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() dto: { base: string, head: string, strategy?: 'merge' | 'squash' | 'rebase', message?: string },
    @Req() req: Request
  ) {
    const user = await this.authorize(owner, repo, req);
    await this.authService.checkRepositoryPermission(user, owner, repo, 'write');
    return this.gitOps.performMerge(owner, repo, dto.base, dto.head, dto.strategy, dto.message);
  }
}
