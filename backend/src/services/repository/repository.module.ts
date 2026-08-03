import { Module } from "@nestjs/common";
import { RepositoryService } from "./repository.service";
import { BranchService } from "./branch.service";
import { CommitService } from "./commit.service";
import { IssueService } from "./issue.service";
import { PullRequestService } from "./pull-request.service";
import { DiscussionService } from "./discussion.service";
import { ReleaseService } from "./release.service";
import { LabelService } from "./label.service";
import { ProjectService } from "./project.service";
import { WikiService } from "./wiki.service";

import { NotificationServiceModule } from "../notification/notification.module";
import { SecurityServiceModule } from "../security/security.module";

@Module({
  imports: [NotificationServiceModule, SecurityServiceModule],
  providers: [
    RepositoryService,
    BranchService,
    CommitService,
    IssueService,
    PullRequestService,
    DiscussionService,
    ReleaseService,
    LabelService,
    ProjectService,
    WikiService,
  ],
  exports: [
    RepositoryService,
    BranchService,
    CommitService,
    IssueService,
    PullRequestService,
    DiscussionService,
    ReleaseService,
    LabelService,
    ProjectService,
    WikiService,
  ],
})
export class RepositoryServiceModule {}
