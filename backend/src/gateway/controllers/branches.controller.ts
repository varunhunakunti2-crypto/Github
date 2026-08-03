import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { BranchService } from "../../services/repository/branch.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller("repositories/:owner/:repo/branches")
export class BranchesController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  list(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.branchService.list(owner, repo);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) {
    return this.branchService.create(owner, repo, dto);
  }

  @Delete(":branch")
  @UseGuards(AuthGuard)
  remove(@Param("owner") owner: string, @Param("repo") repo: string, @Param("branch") branch: string) {
    return this.branchService.remove(owner, repo, branch);
  }

  @Get("protection")
  listRules(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.branchService.listProtectionRules(owner, repo);
  }

  @Post("protection")
  @UseGuards(AuthGuard)
  createRule(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @CurrentUser() user: User,
    @Body() dto: any
  ) {
    return this.branchService.createOrUpdateProtectionRule(owner, repo, user.id, dto);
  }

  @Delete("protection/:id")
  @UseGuards(AuthGuard)
  deleteRule(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @CurrentUser() user: User,
    @Param("id") id: string
  ) {
    return this.branchService.deleteProtectionRule(owner, repo, user.id, id);
  }
}
