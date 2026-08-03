import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Server, ClientInfo, AuthContext } from 'ssh2';
import { GitCommandRunner } from '../utils/git-command-runner';
import { AuthService, UserContext } from '../services/auth.service';
import { prisma } from '@gitforge/database';

export class SshServer {
  private server: Server;
  private readonly dataBasePath = process.env.GIT_DATA_PATH || path.join(process.cwd(), 'data', 'repos');
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(); // In a real NestJS app, this would be injected

    const hostKeyPath = process.env.SSH_HOST_KEY || path.join(__dirname, '..', '..', 'keys', 'host_rsa');
    
    // Ensure host key exists for development
    if (!fs.existsSync(hostKeyPath)) {
      console.warn(`[SSH] Host key not found at ${hostKeyPath}. Please generate one using: ssh-keygen -t rsa -f keys/host_rsa -N ""`);
    }

    this.server = new Server(
      {
        hostKeys: fs.existsSync(hostKeyPath) ? [fs.readFileSync(hostKeyPath)] : [],
      },
      (client, clientInfo) => this.handleClient(client, clientInfo)
    );
  }

  public listen(port: number = 2222, host: string = '0.0.0.0'): void {
    this.server.listen(port, host, () => {
      console.log(`[SSH] Git SSH Daemon listening on ${host}:${port}`);
    });
  }

  private handleClient(client: any, clientInfo: ClientInfo): void {
    console.log(`[SSH] Client connected: ${clientInfo.ip}`);
    
    let authenticatedUser: UserContext | null = null;

    client.on('authentication', async (ctx: AuthContext) => {
      try {
        if (ctx.method === 'publickey') {
          const presentedKey = ctx.key.data;
          
          const fingerprint = crypto.createHash('sha256').update(presentedKey).digest('base64').replace(/=$/, '');
          console.log(`[SSH] Auth attempt with key fingerprint SHA256:${fingerprint}`);

          // Query the SshKey table
          const dbKey = await prisma.sshKey.findUnique({
            where: { fingerprint },
            include: { user: true }
          });

          if (!dbKey) {
            console.warn(`[SSH] Rejected unregistered key fingerprint: SHA256:${fingerprint}`);
            return ctx.reject(['publickey']);
          }

          if (dbKey.keyType === 'signing') {
            console.warn(`[SSH] Rejected signing key fingerprint: SHA256:${fingerprint}`);
            return ctx.reject(['publickey']);
          }

          authenticatedUser = {
            id: dbKey.user.id,
            username: dbKey.user.username,
            roles: ['User']
          };

          if (ctx.signature) {
            return ctx.accept();
          } else {
            return ctx.accept();
          }
        }
        
        ctx.reject(['publickey']);
      } catch (err) {
        console.error('[SSH] Authentication error', err);
        ctx.reject(['publickey']);
      }
    });

    client.on('ready', () => {
      console.log(`[SSH] Client authenticated as ${authenticatedUser?.username}`);

      client.on('session', (accept: any, reject: any) => {
        const session = accept();

        session.on('exec', async (acceptExec: any, rejectExec: any, info: any) => {
          console.log(`[SSH] Exec requested: ${info.command}`);
          
          // The command looks like: git-upload-pack 'owner/repo.git'
          const commandMatch = /^git-(upload|receive)-pack\s+'\/?([^/]+)\/([^/]+)\.git'$/.exec(info.command);

          if (!commandMatch) {
            console.warn(`[SSH] Rejected invalid command format: ${info.command}`);
            const stream = acceptExec();
            stream.stderr.write('Invalid command format. Only git-upload-pack and git-receive-pack are supported.\n');
            stream.exit(1);
            stream.end();
            return;
          }

          const action = commandMatch[1]; // 'upload' or 'receive'
          const owner = commandMatch[2];
          const repo = commandMatch[3];
          const requiredAccess = action === 'receive' ? 'write' : 'read';

          // Validate repo paths
          try {
            GitCommandRunner.validatePathSegment(owner);
            GitCommandRunner.validatePathSegment(repo);
          } catch (e) {
            const stream = acceptExec();
            stream.stderr.write('Invalid repository path.\n');
            stream.exit(1);
            stream.end();
            return;
          }

          const repoPath = GitCommandRunner.buildRepoPath(this.dataBasePath, owner, repo);

          // Verify existence
          if (!fs.existsSync(repoPath)) {
            const stream = acceptExec();
            stream.stderr.write('Repository not found.\n');
            stream.exit(1);
            stream.end();
            return;
          }

          // Authorize access
          if (!authenticatedUser) {
            const stream = acceptExec();
            stream.stderr.write('Unauthenticated.\n');
            stream.exit(1);
            stream.end();
            return;
          }

          try {
            await this.authService.checkRepositoryPermission(authenticatedUser, owner, repo, requiredAccess);
          } catch (authErr: any) {
            const stream = acceptExec();
            stream.stderr.write(`${authErr.message || 'Access denied'}\n`);
            stream.exit(1);
            stream.end();
            return;
          }

          // Spawn git subprocess securely
          const stream = acceptExec();
          const gitProcess = GitCommandRunner.spawnStreaming(
            [`${action}-pack`, repoPath]
          );

          // Stream bidirectional communication
          stream.pipe(gitProcess.stdin);
          gitProcess.stdout.pipe(stream);

          gitProcess.stderr.on('data', (data) => {
            console.error(`[SSH] ${action}-pack stderr:`, data.toString());
            // Optionally pipe stderr to client, but usually git CLI prefers structured stderr
            stream.stderr.write(data);
          });

          gitProcess.on('close', (code) => {
            console.log(`[SSH] ${action}-pack exited with code ${code}`);
            stream.exit(code ?? 0);
            stream.end();
          });

          gitProcess.on('error', (err) => {
            console.error(`[SSH] Subprocess error:`, err);
            stream.stderr.write('Internal server error during git operation.\n');
            stream.exit(1);
            stream.end();
          });
        });
      });
    });

    client.on('error', (err: any) => {
      console.error('[SSH] Client error:', err.message);
    });

    client.on('end', () => {
      console.log('[SSH] Client disconnected');
    });
  }
}
