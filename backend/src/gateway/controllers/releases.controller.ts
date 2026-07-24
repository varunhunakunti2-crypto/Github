import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { ReleaseService } from "../../services/repository/release.service";

@Controller("repositories/:owner/:repo/releases")
export class ReleasesController {
  constructor(private readonly releaseService: ReleaseService) {}

  @Get()
  list(@Param("owner") owner: string, @Param("repo") repo: string) { return this.releaseService.list(owner, repo); }

  @Post()
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.releaseService.create(owner, repo, dto); }
}
