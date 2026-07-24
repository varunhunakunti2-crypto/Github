import { Module } from "@nestjs/common";
import { OrganizationService } from "./organization.service";
import { TeamService } from "./team.service";
import { PermissionService } from "./permission.service";

@Module({
  providers: [OrganizationService, TeamService, PermissionService],
  exports: [OrganizationService, TeamService, PermissionService],
})
export class OrganizationServiceModule {}
