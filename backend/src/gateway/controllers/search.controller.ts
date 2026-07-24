import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "../../services/search/search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query("q") query: string, @Query("type") type: string) { return this.searchService.search(query, type); }
}
