import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { DiscussionService } from "../../services/repository/discussion.service";

@Controller("repositories/:owner/:repo")
export class DiscussionsController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Get("discussions")
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.discussionService.list(owner, repo); }

  @Post("discussions")
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.discussionService.create(owner, repo, dto); }
}
