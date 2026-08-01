import { Module } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { WorkflowParserService } from "./workflow-parser.service";
import { JobService } from "./job.service";
import { ArtifactService } from "./artifact.service";
import { SecretService } from "./secret.service";
import { StorageServiceModule } from "../storage/storage.module";

@Module({
  imports: [StorageServiceModule],
  providers: [WorkflowService, WorkflowParserService, JobService, ArtifactService, SecretService],
  exports: [WorkflowService, WorkflowParserService, JobService, ArtifactService, SecretService],
})
export class ActionsServiceModule {}
