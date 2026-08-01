import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { OrganizationService } from "../../services/organization/organization.service";
import { TeamService } from "../../services/organization/team.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@gitforge/database";

@Controller()
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly teamService: TeamService
  ) {}

  @Get("organizations/check-slug/:slug")
  checkSlug(@Param("slug") slug: string) {
    return this.orgService.checkSlug(slug);
  }

  @Post("organizations")
  create(@Body() dto: any, @CurrentUser() user: User) {
    return this.orgService.create(dto, user.id);
  }

  @Get("organizations/:org")
  findOne(@Param("org") org: string, @CurrentUser() user: User) {
    return this.orgService.findOne(org, user.id);
  }

  @Put("organizations/:org")
  update(@Param("org") org: string, @Body() dto: any, @CurrentUser() user: User) {
    return this.orgService.update(org, dto, user.id);
  }

  @Delete("organizations/:org")
  remove(@Param("org") org: string, @CurrentUser() user: User) {
    return this.orgService.delete(org, user.id);
  }

  @Get("organizations/:org/members")
  getMembers(@Param("org") org: string, @CurrentUser() user: User) {
    return this.orgService.getMembers(org, user.id);
  }

  @Get("organizations/:org/repositories")
  getRepositories(@Param("org") org: string, @CurrentUser() user: User) {
    return this.orgService.getRepositories(org, user.id);
  }

  @Put("organizations/:org/members/:username")
  updateMemberRole(
    @Param("org") org: string,
    @Param("username") username: string,
    @Body("role") role: string,
    @CurrentUser() user: User
  ) {
    return this.orgService.updateMemberRole(org, username, role, user.id);
  }

  @Delete("organizations/:org/members/:username")
  removeMember(
    @Param("org") org: string,
    @Param("username") username: string,
    @CurrentUser() user: User
  ) {
    return this.orgService.removeMember(org, username, user.id);
  }

  @Post("organizations/:org/invitations")
  inviteMember(
    @Param("org") org: string,
    @Body("emailOrUsername") emailOrUsername: string,
    @Body("role") role: string,
    @CurrentUser() user: User
  ) {
    return this.orgService.inviteMember(org, emailOrUsername, role, user.id);
  }

  @Get("organizations/:org/invitations")
  getInvitations(@Param("org") org: string, @CurrentUser() user: User) {
    return this.orgService.getInvitations(org, user.id);
  }

  @Delete("organizations/:org/invitations/:id")
  revokeInvitation(
    @Param("org") org: string,
    @Param("id") invitationId: string,
    @CurrentUser() user: User
  ) {
    return this.orgService.revokeInvitation(org, invitationId, user.id);
  }

  @Get("organizations/:org/teams")
  getTeams(@Param("org") org: string, @CurrentUser() user: User) {
    return this.teamService.list(org, user.id);
  }

  @Post("organizations/:org/teams")
  createTeam(
    @Param("org") org: string,
    @Body() dto: any,
    @CurrentUser() user: User
  ) {
    return this.teamService.create(org, dto, user.id);
  }

  @Get("organizations/:org/teams/:teamSlug")
  getTeam(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @CurrentUser() user: User
  ) {
    return this.teamService.findOne(org, teamSlug, user.id);
  }

  @Put("organizations/:org/teams/:teamSlug")
  updateTeam(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @Body() dto: any,
    @CurrentUser() user: User
  ) {
    return this.teamService.update(org, teamSlug, dto, user.id);
  }

  @Delete("organizations/:org/teams/:teamSlug")
  deleteTeam(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @CurrentUser() user: User
  ) {
    return this.teamService.delete(org, teamSlug, user.id);
  }

  @Put("organizations/:org/teams/:teamSlug/members/:username")
  addTeamMember(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @Param("username") username: string,
    @Body("role") role: string,
    @CurrentUser() user: User
  ) {
    return this.teamService.addMember(org, teamSlug, username, role, user.id);
  }

  @Delete("organizations/:org/teams/:teamSlug/members/:username")
  removeTeamMember(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @Param("username") username: string,
    @CurrentUser() user: User
  ) {
    return this.teamService.removeMember(org, teamSlug, username, user.id);
  }

  @Put("organizations/:org/teams/:teamSlug/repositories/:repo")
  grantRepoAccess(
    @Param("org") org: string,
    @Param("teamSlug") teamSlug: string,
    @Param("repo") repo: string,
    @Body("permission") permission: string,
    @CurrentUser() user: User
  ) {
    return this.teamService.grantRepoAccess(org, teamSlug, repo, permission, user.id);
  }

  // Public/accept invitation routes
  @Get("invitations/:token")
  getInvitationByToken(@Param("token") token: string) {
    return this.orgService.getInvitationByToken(token);
  }

  @Post("invitations/:token/accept")
  acceptInvitation(@Param("token") token: string, @CurrentUser() user: User) {
    return this.orgService.acceptInvitation(token, user.id);
  }

  @Post("invitations/:token/decline")
  declineInvitation(@Param("token") token: string, @CurrentUser() user: User) {
    return this.orgService.declineInvitation(token, user.id);
  }
}
