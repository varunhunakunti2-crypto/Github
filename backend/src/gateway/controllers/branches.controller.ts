import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { BranchService } from "../../services/repository/branch.service";

@Controller("repositories/:owner/:repo/branches")
export class BranchesController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.branchService.list(owner, repo); }

  @Post()
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.branchService.create(owner, repo, dto); }

  @Delete(":branch")
  remove(@Param("owner") owner: string, @Param("repo") repo: string, @Param("branch") branch: string) { return this.branchService.remove(owner, repo, branch); }
}
