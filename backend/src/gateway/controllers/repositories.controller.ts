import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { RepositoryService } from "../../services/repository/repository.service";

@Controller("repositories")
export class RepositoriesController {
  constructor(private readonly repoService: RepositoryService) {}

  @Post()
  create(@Body() dto: any) { return this.repoService.create(dto); }

  @Get(":owner/:repo")
  findOne(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.findOne(owner, repo); }

  @Put(":owner/:repo")
  update(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.repoService.update(owner, repo, dto); }

  @Delete(":owner/:repo")
  remove(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.remove(owner, repo); }

  @Post(":owner/:repo/fork")
  fork(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.fork(owner, repo); }

  @Post(":owner/:repo/star")
  star(@Param("owner") owner: string, @Param("repo") repo: string) { return this.repoService.star(owner, repo); }

  @Get(":owner/:repo/collaborators")
  getCollaborators(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.repoService.getCollaborators(owner, repo);
  }
}
