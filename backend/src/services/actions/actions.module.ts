import { Module } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { JobService } from "./job.service";
import { ArtifactService } from "./artifact.service";
import { SecretService } from "./secret.service";

@Module({
  providers: [WorkflowService, JobService, ArtifactService, SecretService],
  exports: [WorkflowService, JobService, ArtifactService, SecretService],
})
export class ActionsServiceModule {}
