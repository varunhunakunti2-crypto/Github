import { Controller, Get, Post, Param, Query, Req, Res, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GitCommandRunner } from '../utils/git-command-runner';
import { AuthService } from '../services/auth.service';

// Format git pkt-line
function pktLine(str: string): string {
  const len = (str.length + 4).toString(16).padStart(4, '0');
  return `${len}${str}`;
}

@Controller()
export class SmartHttpController {
  private readonly dataBasePath = process.env.GIT_DATA_PATH || path.join(process.cwd(), 'data', 'repos');

  constructor(private readonly authService: AuthService) {}

  private async authorizeAndGetRepoPath(
    owner: string,
    repo: string,
    req: Request,
    requiredAccess: 'read' | 'write'
  ): Promise<string> {
    const repoPath = GitCommandRunner.buildRepoPath(this.dataBasePath, owner, repo);
    
    if (!fs.existsSync(repoPath)) {
      throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Perform actual authentication
    const user = await this.authService.authenticateHeader(authHeader);
    
    // Perform authorization check
    await this.authService.checkRepositoryPermission(user, owner, repo, requiredAccess);

    return repoPath;
  }

  @Get(':owner/:repo.git/info/refs')
  async getInfoRefs(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('service') service: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (service !== 'git-upload-pack' && service !== 'git-receive-pack') {
      return res.status(HttpStatus.FORBIDDEN).send('Unsupported service');
    }

    try {
      const accessMode = service === 'git-receive-pack' ? 'write' : 'read';
      
      // In Git protocol, missing auth should return 401 with WWW-Authenticate
      let repoPath: string;
      try {
        repoPath = await this.authorizeAndGetRepoPath(owner, repo, req, accessMode);
      } catch (err: any) {
        if (err.getStatus && err.getStatus() === HttpStatus.UNAUTHORIZED) {
          res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
          return res.status(HttpStatus.UNAUTHORIZED).send('Authentication required');
        }
        throw err;
      }

      res.setHeader('Content-Type', `application/x-${service}-advertisement`);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the Git Smart HTTP required prefix
      res.write(pktLine(`# service=${service}\n`));
      res.write('0000'); // flush packet

      // Execute git command
      const action = service === 'git-upload-pack' ? 'upload-pack' : 'receive-pack';
      
      const gitProcess = GitCommandRunner.spawnStreaming(
        [action, '--stateless-rpc', '--advertise-refs', repoPath]
      );

      gitProcess.stdout.pipe(res);
      
      gitProcess.stderr.on('data', (data) => {
        console.error(`[GIT-DAEMON] ${service} stderr:`, data.toString());
      });

      gitProcess.on('error', (err) => {
        console.error(`[GIT-DAEMON] Failed to start ${service}:`, err);
        if (!res.headersSent) res.status(500).end();
      });

    } catch (err: any) {
      console.error('[GIT-DAEMON] info/refs error:', err);
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  }

  @Post(':owner/:repo.git/git-upload-pack')
  async uploadPack(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      let repoPath: string;
      try {
        repoPath = await this.authorizeAndGetRepoPath(owner, repo, req, 'read');
      } catch (err: any) {
        if (err.getStatus && err.getStatus() === HttpStatus.UNAUTHORIZED) {
          res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
          return res.status(HttpStatus.UNAUTHORIZED).send('Authentication required');
        }
        throw err;
      }

      res.setHeader('Content-Type', 'application/x-git-upload-pack-result');
      res.setHeader('Cache-Control', 'no-cache');

      const gitProcess = GitCommandRunner.spawnStreaming(
        ['upload-pack', '--stateless-rpc', repoPath]
      );

      req.pipe(gitProcess.stdin);
      gitProcess.stdout.pipe(res);

      gitProcess.stderr.on('data', (data) => {
        console.error(`[GIT-DAEMON] upload-pack stderr:`, data.toString());
      });

      gitProcess.on('error', (err) => {
        console.error(`[GIT-DAEMON] Failed to execute upload-pack:`, err);
        if (!res.headersSent) res.status(500).end();
      });

    } catch (err: any) {
      console.error('[GIT-DAEMON] upload-pack error:', err);
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  }

  @Post(':owner/:repo.git/git-receive-pack')
  async receivePack(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      let repoPath: string;
      try {
        repoPath = await this.authorizeAndGetRepoPath(owner, repo, req, 'write');
      } catch (err: any) {
        if (err.getStatus && err.getStatus() === HttpStatus.UNAUTHORIZED) {
          res.setHeader('WWW-Authenticate', 'Basic realm="GitForge"');
          return res.status(HttpStatus.UNAUTHORIZED).send('Authentication required');
        }
        throw err;
      }

      res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
      res.setHeader('Cache-Control', 'no-cache');

      const gitProcess = GitCommandRunner.spawnStreaming(
        ['receive-pack', '--stateless-rpc', repoPath]
      );

      req.pipe(gitProcess.stdin);
      gitProcess.stdout.pipe(res);

      gitProcess.stderr.on('data', (data) => {
        console.error(`[GIT-DAEMON] receive-pack stderr:`, data.toString());
      });

      gitProcess.on('error', (err) => {
        console.error(`[GIT-DAEMON] Failed to execute receive-pack:`, err);
        if (!res.headersSent) res.status(500).end();
      });

    } catch (err: any) {
      console.error('[GIT-DAEMON] receive-pack error:', err);
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  }
}
