import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SshServer } from './ssh/ssh-server';
import * as fs from 'fs';
import * as path from 'path';
import { RepoInitService } from './services/repo-init.service';

function installHooksOnExistingRepos() {
  const dataBasePath = process.env.GIT_DATA_PATH || path.join(process.cwd(), 'data', 'repos');
  if (!fs.existsSync(dataBasePath)) return;

  const repoInit = new RepoInitService();

  try {
    const owners = fs.readdirSync(dataBasePath);
    for (const owner of owners) {
      const ownerPath = path.join(dataBasePath, owner);
      if (!fs.statSync(ownerPath).isDirectory()) continue;

      const repos = fs.readdirSync(ownerPath);
      for (const repo of repos) {
        const repoPath = path.join(ownerPath, repo);
        if (fs.statSync(repoPath).isDirectory() && repo.endsWith('.git')) {
          console.log(`[BOOTSTRAP] Injecting hooks for existing repo: ${owner}/${repo}`);
          repoInit.writeHooks(repoPath);
        }
      }
    }
  } catch (err) {
    console.error("[BOOTSTRAP] Failed to process existing repository hooks:", err);
  }
}

async function bootstrap() {
  // Update hooks on existing repos on boot
  installHooksOnExistingRepos();

  const app = await NestFactory.create(AppModule);
  
  // Set up standard express body parser for LFS and API, 
  // but keep raw stream for Git Smart HTTP POSTs
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
    limit: '50mb'
  }));

  const httpPort = process.env.PORT || 3002;
  await app.listen(httpPort);
  console.log(`[HTTP] GitForge Backend HTTP listening on port ${httpPort}`);

  try {
    const sshServer = new SshServer();
    sshServer.listen(2222, '0.0.0.0');
  } catch (err) {
    console.warn("[SSH] Server init deferred:", err);
  }
}

bootstrap();
