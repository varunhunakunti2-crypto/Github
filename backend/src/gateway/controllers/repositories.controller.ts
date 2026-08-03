import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { RepositoryService } from "../../services/repository/repository.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { ScopeGuard } from "../../common/guards/scope.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";

@Controller("repositories")
@UseGuards(AuthGuard, ScopeGuard)
export class RepositoriesController {
  constructor(private readonly repoService: RepositoryService) {}

  @Post()
  @Scopes("repo")
  create(@Body() dto: any) { return this.repoService.create(dto); }

  @Get(":owner/:repo")
  findOne(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.findOne(owner, repo); }

  @Put(":owner/:repo")
  @Scopes("repo")
  update(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.repoService.update(owner, repo, dto); }

  @Delete(":owner/:repo")
  @Scopes("repo")
  remove(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.remove(owner, repo); }

  @Post(":owner/:repo/fork")
  @Scopes("repo")
  fork(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.fork(owner, repo); }

  @Post(":owner/:repo/star")
  star(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.star(owner, repo); }

  @Get(":owner/:repo/collaborators")
  getCollaborators(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.repoService.getCollaborators(owner, repo);
  }

  @Get(":owner/:repo/contents/*")
  getContents(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("0") filePath: string,
    @Query("ref") ref: string = "HEAD"
  ) {
    // In NestJS, wildcard parameter match is available as param "0" when mapping wildcards like contents/*
    return this.repoService.getContents(owner, repo, filePath || "README.md", ref);
  }
}

