import { Module } from "@nestjs/common";
import { NpmRegistryService } from "./npm-registry.service";
import { DockerRegistryService } from "./docker-registry.service";
import { MavenRegistryService } from "./maven-registry.service";
import { PypiRegistryService } from "./pypi-registry.service";
import { StorageServiceModule } from "../storage/storage.module";

@Module({
  imports: [StorageServiceModule],
  providers: [
    NpmRegistryService,
    DockerRegistryService,
    MavenRegistryService,
    PypiRegistryService
  ],
  exports: [
    NpmRegistryService,
    DockerRegistryService,
    MavenRegistryService,
    PypiRegistryService
  ]
})
export class PackageServiceModule {}
