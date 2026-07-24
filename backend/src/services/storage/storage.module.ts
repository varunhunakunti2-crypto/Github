import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { FileService } from "./file.service";

@Module({
  providers: [StorageService, FileService],
  exports: [StorageService, FileService],
})
export class StorageServiceModule {}
