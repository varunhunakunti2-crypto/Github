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

@Module({
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
  ],
})
export class RepositoryServiceModule {}
