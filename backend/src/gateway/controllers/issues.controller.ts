import { Controller, Get, Post, Put, Param, Body } from "@nestjs/common";
import { IssueService } from "../../services/repository/issue.service";

@Controller("repositories/:owner/:repo/issues")
export class IssuesController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.issueService.list(owner, repo); }

  @Post()
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.issueService.create(owner, repo, dto); }

  @Get(":number")
  findOne(@Param("owner") owner: string, @Param("repo") repo: string, @Param("number") number: number) { return this.issueService.findOne(owner, repo, number); }

  @Put(":number")
  update(@Param("owner") owner: string, @Param("repo") repo: string, @Param("number") number: number, @Body() dto: any) { return this.issueService.update(owner, repo, number, dto); }
}
