import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { SshKeyService } from "../../services/security/ssh-key.service";
import { TokenService } from "../../services/security/token.service";
import { WebhookService } from "../../services/security/webhook.service";
import { AuditService } from "../../services/security/audit.service";
import { SecurityScanService } from "../../services/security/security-scan.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard)
export class SecurityController {
  constructor(
    private readonly sshKeyService: SshKeyService,
    private readonly tokenService: TokenService,
    private readonly webhookService: WebhookService,
    private readonly auditService: AuditService,
    private readonly securityScanService: SecurityScanService,
  ) {}

  @Get("user/ssh-keys")
  listSshKeys(@CurrentUser() user: User) {
    return this.sshKeyService.list(user.id);
  }

  @Post("user/ssh-keys")
  addSshKey(@CurrentUser() user: User, @Body() dto: any) {
    return this.sshKeyService.add(user.id, dto);
  }

  @Delete("user/ssh-keys/:id")
  removeSshKey(@CurrentUser() user: User, @Param("id") id: string) {
    return this.sshKeyService.remove(user.id, id);
  }

  @Get("user/tokens")
  listTokens(@CurrentUser() user: User) {
    return this.tokenService.list(user.id);
  }

  @Post("user/tokens")
  createToken(@CurrentUser() user: User, @Body() dto: any) {
    return this.tokenService.create(user.id, dto);
  }

  @Delete("user/tokens/:id")
  revokeToken(@CurrentUser() user: User, @Param("id") id: string) {
    return this.tokenService.revoke(user.id, id);
  }

  @Get("organizations/:org/audit-log")
  getAuditLog(@Param("org") org: string) {
    return this.auditService.getOrgLog(org);
  }

  @Get("repositories/:owner/:repo/security/overview")
  getSecurityOverview(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.securityScanService.getOverview(owner, repo);
  }

  @Get("repositories/:owner/:repo/security/secrets")
  listSecretFindings(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.securityScanService.listSecrets(owner, repo);
  }

  @Patch("repositories/:owner/:repo/security/secrets/:id")
  resolveSecretFinding(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: { status: string }
  ) {
    return this.securityScanService.resolveSecret(owner, repo, user.id, id, body.status);
  }

  @Get("repositories/:owner/:repo/security/dependencies")
  listDependencyAlerts(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.securityScanService.listDependencies(owner, repo);
  }

  @Patch("repositories/:owner/:repo/security/dependencies/:id")
  dismissDependencyAlert(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: { status: string; reason?: string }
  ) {
    return this.securityScanService.dismissDependency(owner, repo, user.id, id, body.status, body.reason);
  }
}
