import { execFile, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface GitCommandOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
}

export class GitCommandError extends Error {
  constructor(public message: string, public code: number, public stderr: string, public stdout: string = '') {
    super(message);
    this.name = 'GitCommandError';
  }
}

export class GitCommandRunner {
  // Validate path segments to prevent directory traversal
  static validatePathSegment(segment: string): void {
    const validPattern = /^[a-zA-Z0-9-_.]+$/;
    if (!validPattern.test(segment) || segment === '..' || segment === '.') {
      throw new Error(`Invalid path segment: ${segment}`);
    }
  }

  static buildRepoPath(basePath: string, owner: string, repo: string): string {
    this.validatePathSegment(owner);
    this.validatePathSegment(repo);
    return path.join(basePath, owner, `${repo}.git`);
  }

  static async execute(
    args: string[],
    options: GitCommandOptions = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const { cwd, timeout = 30000, env = {} } = options;

    // Secure base environment
    const secureEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, // Use host PATH or strict /usr/bin:/bin depending on deployment
      ...env,
    };

    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd,
        timeout,
        env: secureEnv,
        maxBuffer: options.maxBuffer || (1024 * 1024 * 50), // 50MB buffer limit
      });

      const duration = Date.now() - startTime;
      console.log(`[GIT] git ${args[0]} - OK (${duration}ms)`);
      
      return { stdout, stderr };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[GIT] git ${args[0]} - FAILED (${duration}ms):`, error.message);
      
      throw new GitCommandError(
        error.message || 'Git command failed',
        error.code || 1,
        error.stderr || '',
        error.stdout || ''
      );
    }
  }
  static spawnStreaming(
    args: string[],
    options: GitCommandOptions = {}
  ): ChildProcess {
    const { cwd, env = {} } = options;

    const secureEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      ...env,
    };

    return spawn('git', args, {
      cwd,
      env: secureEnv,
    });
  }

  static executeWithStdin(
    args: string[],
    stdin: string,
    options: GitCommandOptions = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const child = this.spawnStreaming(args, options);
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          console.log(`[GIT] git ${args[0]} (stdin) - OK (${duration}ms)`);
          resolve({ stdout, stderr });
        } else {
          console.error(`[GIT] git ${args[0]} (stdin) - FAILED (${duration}ms):`, stderr);
          reject(new GitCommandError(`Command failed: git ${args.join(' ')}`, code || 1, stderr));
        }
      });

      child.stdin?.write(stdin);
      child.stdin?.end();
    });
  }
}
