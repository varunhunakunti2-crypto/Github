import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SearchService } from "../../services/search/search.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("repositories")
  searchRepositories(@Query("q") query: string, @CurrentUser() user: User) {
    return this.searchService.searchRepositories(query || "", user.id);
  }

  @Get("users")
  searchUsers(@Query("q") query: string) {
    return this.searchService.searchUsers(query || "");
  }

  @Get("organizations")
  searchOrganizations(@Query("q") query: string) {
    return this.searchService.searchOrganizations(query || "");
  }

  @Get("issues")
  searchIssues(@Query("q") query: string, @CurrentUser() user: User) {
    return this.searchService.searchIssues(query || "", user.id, false);
  }

  @Get("pulls")
  searchPulls(@Query("q") query: string, @CurrentUser() user: User) {
    return this.searchService.searchIssues(query || "", user.id, true);
  }

  @Get("code")
  searchCode(@Query("q") query: string, @CurrentUser() user: User) {
    return this.searchService.searchCode(query || "", user.id);
  }
}
