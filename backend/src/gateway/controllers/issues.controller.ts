import { Controller, Get, Post, Put, Param, Body, Query, Patch, Delete } from "@nestjs/common";
import { IssueService } from "../../services/repository/issue.service";

@Controller()
export class IssuesController {
  constructor(private readonly issueService: IssueService) {}

  @Get("repositories/:owner/:repo/issues")
  list(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Query() query: any
  ) {
    return this.issueService.list(owner, repo, query);
  }

  @Post("repositories/:owner/:repo/issues")
  create(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() dto: any
  ) {
    const creatorUsername = dto.creator || dto.username || 'appi';
    return this.issueService.create(owner, repo, { ...dto, creatorUsername });
  }

  @Get("repositories/:owner/:repo/issues/:number")
  findOne(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number
  ) {
    return this.issueService.findOne(owner, repo, number);
  }

  @Put("repositories/:owner/:repo/issues/:number")
  update(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.issueService.update(owner, repo, number, { ...dto, username });
  }

  @Post("repositories/:owner/:repo/issues/:number/comments")
  createComment(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.issueService.createComment(owner, repo, number, username, dto);
  }

  @Patch("repositories/:owner/:repo/issues/comments/:id")
  updateComment(
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.issueService.updateComment(id, username, dto.body);
  }

  @Delete("repositories/:owner/:repo/issues/comments/:id")
  deleteComment(
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.issueService.deleteComment(id, username);
  }
}
