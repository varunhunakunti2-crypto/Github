import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { SshKeyService } from "../../services/security/ssh-key.service";
import { TokenService } from "../../services/security/token.service";
import { WebhookService } from "../../services/security/webhook.service";
import { AuditService } from "../../services/security/audit.service";

@Controller()
export class SecurityController {
  constructor(
    private readonly sshKeyService: SshKeyService,
    private readonly tokenService: TokenService,
    private readonly webhookService: WebhookService,
    private readonly auditService: AuditService,
  ) {}

  @Get("user/ssh-keys")
  listSshKeys() { return this.sshKeyService.list(); }

  @Post("user/ssh-keys")
  addSshKey(@Body() dto: any) { return this.sshKeyService.add(dto); }

  @Delete("user/ssh-keys/:id")
  removeSshKey(@Param("id") id: string) { return this.sshKeyService.remove(id); }

  @Get("user/tokens")
  listTokens() { return this.tokenService.list(); }

  @Post("user/tokens")
  createToken(@Body() dto: any) { return this.tokenService.create(dto); }

  @Delete("user/tokens/:id")
  revokeToken(@Param("id") id: string) { return this.tokenService.revoke(id); }

  @Get("organizations/:org/audit-log")
  getAuditLog(@Param("org") org: string) { return this.auditService.getOrgLog(org); }
}
