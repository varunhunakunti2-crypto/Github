import { Controller, Get, Put, Delete, Param, Body, Query, NotFoundException } from "@nestjs/common";
import { WikiService } from "../../services/repository/wiki.service";

@Controller("repositories/:owner/:repo/wiki")
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get("pages")
  listPages(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Query("q") query?: string,
    @Query("username") callerUsername?: string
  ) {
    return this.wikiService.listPages(owner, repo, query, callerUsername);
  }

  @Get("pages/:slug")
  getPage(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("slug") slug: string,
    @Query("username") callerUsername?: string
  ) {
    return this.wikiService.getPage(owner, repo, slug, callerUsername);
  }

  @Put("pages/:slug")
  savePage(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("slug") slug: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.wikiService.savePage(owner, repo, slug, { ...dto, username });
  }

  @Delete("pages/:slug")
  deletePage(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("slug") slug: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.wikiService.deletePage(owner, repo, slug, username);
  }

  @Get("pages/:slug/history")
  getHistory(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("slug") slug: string,
    @Query("username") callerUsername?: string
  ) {
    return this.wikiService.getHistory(owner, repo, slug, callerUsername);
  }

  @Get("pages/:slug/revision/:sha")
  getRevision(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("slug") slug: string,
    @Param("sha") sha: string,
    @Query("username") callerUsername?: string
  ) {
    return this.wikiService.getRevision(owner, repo, slug, sha, callerUsername);
  }
}
