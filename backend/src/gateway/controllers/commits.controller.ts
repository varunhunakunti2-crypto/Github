import { Controller, Get, Param } from "@nestjs/common";
import { CommitService } from "../../services/repository/commit.service";

@Controller("repositories/:owner/:repo")
export class CommitsController {
  constructor(private readonly commitService: CommitService) {}

  @Get("commits")
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.commitService.list(owner, repo); }

  @Get("commits/:sha")
  findOne(@Param("owner") owner: string, @Param("repo") repo: string, @Param("sha") sha: string) { return this.commitService.findOne(owner, repo, sha); }

  @Get("compare/:base...:head")
  compare(@Param("owner") owner: string, @Param("repo") repo: string, @Param("base") baseSha: string, @Param("head") headSha: string) { return this.commitService.compare(owner, repo, baseSha, headSha); }
}
