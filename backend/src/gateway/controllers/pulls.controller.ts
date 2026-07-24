import { Controller, Get, Post, Put, Param, Body } from "@nestjs/common";
import { PullRequestService } from "../../services/repository/pull-request.service";

@Controller("repositories/:owner/:repo/pulls")
export class PullsController {
  constructor(private readonly prService: PullRequestService) {}

  @Get()
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.prService.list(owner, repo); }

  @Post()
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.prService.create(owner, repo, dto); }

  @Get(":number")
  findOne(@Param("owner") owner: string, @Param("repo") repo: string, @Param("number") number: number) { return this.prService.findOne(owner, repo, number); }

  @Put(":number/merge")
  merge(@Param("owner") owner: string, @Param("repo") repo: string, @Param("number") number: number, @Body() dto: any) { return this.prService.merge(owner, repo, number, dto); }
}
