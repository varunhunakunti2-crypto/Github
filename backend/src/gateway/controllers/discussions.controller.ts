import { Controller, Get, Post, Param, Body, Query, Patch, Delete, Put } from "@nestjs/common";
import { DiscussionService } from "../../services/repository/discussion.service";

@Controller("repositories/:owner/:repo")
export class DiscussionsController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Get("discussions")
  list(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Query() query: any
  ) {
    return this.discussionService.list(owner, repo, query);
  }

  @Post("discussions")
  create(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() dto: any
  ) {
    return this.discussionService.create(owner, repo, dto);
  }

  @Get("discussions/:number")
  findOne(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Query("userId") userId?: string
  ) {
    return this.discussionService.findOne(owner, repo, number, userId);
  }

  @Patch("discussions/:number")
  update(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.discussionService.update(owner, repo, number, dto, username);
  }

  @Post("discussions/:number/comments")
  createComment(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.discussionService.createComment(owner, repo, number, username, dto);
  }

  @Patch("discussions/comments/:id")
  updateComment(
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.discussionService.updateComment(id, username, dto.body);
  }

  @Delete("discussions/comments/:id")
  deleteComment(
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || dto?.body?.username || 'appi';
    return this.discussionService.deleteComment(id, username);
  }

  @Post("discussions/:number/poll/vote")
  vote(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.discussionService.vote(owner, repo, number, username, dto);
  }

  @Put("discussions/:number/answer")
  markAnswer(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("number") number: number,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.discussionService.markAnswer(owner, repo, number, username, dto);
  }
}
