import { Module } from "@nestjs/common";
import { AuthController } from "./controllers/auth.controller";
import { UsersController } from "./controllers/users.controller";
import { RepositoriesController } from "./controllers/repositories.controller";
import { BranchesController } from "./controllers/branches.controller";
import { CommitsController } from "./controllers/commits.controller";
import { IssuesController } from "./controllers/issues.controller";
import { PullsController } from "./controllers/pulls.controller";
import { LabelsController } from "./controllers/labels.controller";
import { OrganizationsController } from "./controllers/organizations.controller";
import { DiscussionsController } from "./controllers/discussions.controller";
import { ReleasesController } from "./controllers/releases.controller";
import { WorkflowsController } from "./controllers/workflows.controller";
import { NotificationsController } from "./controllers/notifications.controller";
import { SecurityController } from "./controllers/security.controller";
import { SearchController } from "./controllers/search.controller";
import { ActivityController } from "./controllers/activity.controller";

import { AuthServiceModule } from "../services/auth/auth.module";
import { UsersServiceModule } from "../services/users/users.module";
import { RepositoryServiceModule } from "../services/repository/repository.module";
import { GitServiceModule } from "../services/git/git.module";
import { SearchServiceModule } from "../services/search/search.module";
import { NotificationServiceModule } from "../services/notification/notification.module";
import { ActionsServiceModule } from "../services/actions/actions.module";
import { OrganizationServiceModule } from "../services/organization/organization.module";
import { StorageServiceModule } from "../services/storage/storage.module";
import { EmailServiceModule } from "../services/email/email.module";
import { SecurityServiceModule } from "../services/security/security.module";

@Module({
  imports: [
    AuthServiceModule,
    UsersServiceModule,
    RepositoryServiceModule,
    GitServiceModule,
    SearchServiceModule,
    NotificationServiceModule,
    ActionsServiceModule,
    OrganizationServiceModule,
    StorageServiceModule,
    EmailServiceModule,
    SecurityServiceModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    RepositoriesController,
    BranchesController,
    CommitsController,
    IssuesController,
    PullsController,
    LabelsController,
    OrganizationsController,
    DiscussionsController,
    ReleasesController,
    WorkflowsController,
    NotificationsController,
    SecurityController,
    SearchController,
    ActivityController,
  ],
})
export class GatewayModule {}
