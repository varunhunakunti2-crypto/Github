import { Module } from '@nestjs/common';
import { SmartHttpController } from './controllers/smart-http.controller';
import { RepositoryController } from './controllers/repository.controller';
import { LfsController } from './controllers/lfs.controller';
import { InternalHooksController } from './controllers/internal-hooks.controller';
import { GitOperationsService } from './services/git-operations.service';
import { RepoInitService } from './services/repo-init.service';
import { AuthService } from './services/auth.service';
import { HooksService } from './services/hooks.service';
import { SecretScannerService } from './services/secret-scanner.service';
import { DependencyScannerService } from './services/dependency-scanner.service';

@Module({
  imports: [],
  controllers: [SmartHttpController, RepositoryController, LfsController, InternalHooksController],
  providers: [
    GitOperationsService,
    RepoInitService,
    AuthService,
    HooksService,
    SecretScannerService,
    DependencyScannerService
  ],
})
export class AppModule {}
