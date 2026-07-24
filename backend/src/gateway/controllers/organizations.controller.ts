import { Controller, Get, Post, Put, Param, Body } from "@nestjs/common";
import { OrganizationService } from "../../services/organization/organization.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  create(@Body() dto: any) { return this.orgService.create(dto); }

  @Get(":org")
  findOne(@Param("org") org: string) { return this.orgService.findOne(org); }

  @Put(":org")
  update(@Param("org") org: string, @Body() dto: any) { return this.orgService.update(org, dto); }

  @Get(":org/members")
  getMembers(@Param("org") org: string) { return this.orgService.getMembers(org); }

  @Get(":org/teams")
  getTeams(@Param("org") org: string) { return this.orgService.getTeams(org); }
}
