import { Module } from "@nestjs/common";
import { SshKeyService } from "./ssh-key.service";
import { TokenService } from "./token.service";
import { WebhookService } from "./webhook.service";
import { AuditService } from "./audit.service";
import { SecurityScanService } from "./security-scan.service";
import { AdminService } from "./admin.service";
import { CacheService } from "./cache.service";
import { NotificationServiceModule } from "../notification/notification.module";

@Module({
  imports: [NotificationServiceModule],
  providers: [SshKeyService, TokenService, WebhookService, AuditService, SecurityScanService, AdminService, CacheService],
  exports: [SshKeyService, TokenService, WebhookService, AuditService, SecurityScanService, AdminService, CacheService],
})
export class SecurityServiceModule {}
