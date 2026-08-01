import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { IndexSyncJob } from "./index-sync.job";

@Module({
  providers: [SearchService, IndexSyncJob],
  exports: [SearchService, IndexSyncJob],
})
export class SearchServiceModule {}
