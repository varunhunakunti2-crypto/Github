import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SshServer } from './ssh/ssh-server';

async function bootstrap() {
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
