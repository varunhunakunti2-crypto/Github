import { Module } from "@nestjs/common";
import { GitService } from "./git.service";
import { GitObjectService } from "./git-object.service";

@Module({
  providers: [GitService, GitObjectService],
  exports: [GitService, GitObjectService],
})
export class GitServiceModule {}
