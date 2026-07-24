import { Module } from "@nestjs/common";
import { SshKeyService } from "./ssh-key.service";
import { TokenService } from "./token.service";
import { WebhookService } from "./webhook.service";
import { AuditService } from "./audit.service";

@Module({
  providers: [SshKeyService, TokenService, WebhookService, AuditService],
  exports: [SshKeyService, TokenService, WebhookService, AuditService],
})
export class SecurityServiceModule {}
