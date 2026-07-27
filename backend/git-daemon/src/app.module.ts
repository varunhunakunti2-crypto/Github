import { Module } from '@nestjs/common';
import { SmartHttpController } from './controllers/smart-http.controller';
import { RepositoryController } from './controllers/repository.controller';
import { LfsController } from './controllers/lfs.controller';
import { GitOperationsService } from './services/git-operations.service';
import { RepoInitService } from './services/repo-init.service';
import { AuthService } from './services/auth.service';
import { HooksService } from './services/hooks.service';

@Module({
  imports: [],
  controllers: [SmartHttpController, RepositoryController, LfsController],
  providers: [GitOperationsService, RepoInitService, AuthService, HooksService],
})
export class AppModule {}
