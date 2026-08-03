import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { AuditService } from "../../services/security/audit.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.isPlatformAdmin) {
      throw new ForbiddenException("Requires platform administrator privileges");
    }

    if (user.isSuspended) {
      throw new ForbiddenException("Your account is suspended");
    }

    // Log the admin console access attempt (even read-only)
    const action = `admin.access.${request.method.toLowerCase()}`;
    await this.auditService.log(
      action,
      user.id,
      "AdminConsole",
      request.url || "global",
      request.ip || "127.0.0.1"
    );

    return true;
  }
}
