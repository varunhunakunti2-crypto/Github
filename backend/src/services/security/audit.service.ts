import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class AuditService {
  async log(
    action: string,
    actorId: string,
    targetType: string,
    targetId: string,
    details?: string,
    ipAddress?: string,
    organizationId?: string
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          action,
          actorId,
          targetType,
          targetId,
          details: details || null,
          ipAddress: ipAddress || null,
          organizationId: organizationId || null,
        }
      });
    } catch (err) {
      console.error("Failed to write to audit log:", err);
    }
  }

  async getOrgLog(orgSlug: string) {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) return [];
    return prisma.auditLog.findMany({
      where: { organizationId: org.id },
      include: { actor: { select: { username: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  }
}
