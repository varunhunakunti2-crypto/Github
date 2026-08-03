import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { AuditService } from "./audit.service";

@Injectable()
export class AdminService {
  constructor(private readonly auditService: AuditService) {}

  // ── User Management ──────────────────────────────────────────────────

  async listUsers(query?: string) {
    const whereClause = query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {};

    return prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        isPlatformAdmin: true,
        isSuspended: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async suspendUser(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException("You cannot suspend your own account");
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isSuspended: true },
    });

    await this.auditService.log("admin.user.suspend", adminId, "User", targetUserId);
    return updated;
  }

  async unsuspendUser(adminId: string, targetUserId: string) {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isSuspended: false },
    });

    await this.auditService.log("admin.user.unsuspend", adminId, "User", targetUserId);
    return updated;
  }

  async promoteAdmin(adminId: string, targetUserId: string) {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isPlatformAdmin: true },
    });

    await this.auditService.log("admin.user.promote", adminId, "User", targetUserId);
    return updated;
  }

  async demoteAdmin(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException("You cannot demote yourself");
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isPlatformAdmin: false },
    });

    await this.auditService.log("admin.user.demote", adminId, "User", targetUserId);
    return updated;
  }

  async forcePasswordReset(adminId: string, targetUserId: string) {
    const crypto = require("crypto");
    const tempPassword = crypto.randomBytes(8).toString("hex");
    
    // Hash new password using bcrypt
    const bcrypt = require("bcryptjs");
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    await this.auditService.log("admin.user.force_password_reset", adminId, "User", targetUserId);
    
    return { tempPassword };
  }

  async getUserAuditTrail(targetUserId: string) {
    return prisma.auditLog.findMany({
      where: { actorId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ── Repository Management ────────────────────────────────────────────

  async listRepositories(query?: string) {
    const whereClause = query
      ? {
          name: { contains: query, mode: "insensitive" as const },
        }
      : {};

    const repos = await prisma.repository.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, username: true } },
        organization: { select: { id: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // In a real system, we'd query storage foot print sizes.
    // For this monorepo, we mock sizeBytes for each category.
    return repos.map((repo) => ({
      ...repo,
      sizeBytes: 1542000, // mock repo size (1.5MB)
      storageFootprint: {
        gitSize: 450000,
        lfsSize: 1000000,
        artifactsSize: 50000,
        packagesSize: 42000,
      },
    }));
  }

  async archiveRepository(adminId: string, owner: string, repo: string, reason: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } },
        ],
      },
    });

    if (!repository) throw new NotFoundException("Repository not found");

    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data: { isArchived: true },
    });

    await this.auditService.log("admin.repository.archive", adminId, "Repository", repository.id, reason);
    return updated;
  }

  async unarchiveRepository(adminId: string, owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } },
        ],
      },
    });

    if (!repository) throw new NotFoundException("Repository not found");

    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data: { isArchived: false },
    });

    await this.auditService.log("admin.repository.unarchive", adminId, "Repository", repository.id);
    return updated;
  }

  async transferRepositoryOwnership(adminId: string, owner: string, repoName: string, newOwnerUsername: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repoName,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } },
        ],
      },
    });

    if (!repository) throw new NotFoundException("Repository not found");

    const newOwner = await prisma.user.findUnique({
      where: { username: newOwnerUsername }
    });

    if (!newOwner) throw new NotFoundException("New owner user not found");

    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data: {
        ownerId: newOwner.id,
        organizationId: null, // Clear org if transferring to user
      }
    });

    await this.auditService.log("admin.repository.transfer", adminId, "Repository", repository.id, `Transferred from ${owner} to ${newOwnerUsername}`);
    return updated;
  }

  async deleteRepository(adminId: string, owner: string, repo: string, reason: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } },
        ],
      },
    });

    if (!repository) throw new NotFoundException("Repository not found");

    await prisma.repository.delete({
      where: { id: repository.id }
    });

    await this.auditService.log("admin.repository.delete", adminId, "Repository", repository.id, reason);
    return { success: true };
  }

  // ── Reports Management ───────────────────────────────────────────────

  async createReport(reporterId: string, dto: { reportedType: string; reportedId: string; reason: string; description?: string }) {
    return prisma.adminReport.create({
      data: {
        reporterId,
        reportedType: dto.reportedType,
        reportedId: dto.reportedId,
        reason: dto.reason,
        description: dto.description,
      }
    });
  }

  async listReports(status?: string, type?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.reportedType = type;

    return prisma.adminReport.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async reviewReport(adminId: string, reportId: string) {
    return prisma.adminReport.update({
      where: { id: reportId },
      data: {
        status: "reviewing",
        reviewedById: adminId,
        reviewedAt: new Date(),
      }
    });
  }

  async actionReport(adminId: string, reportId: string, actionNote: string) {
    const updated = await prisma.adminReport.update({
      where: { id: reportId },
      data: {
        status: "actioned",
        reviewedById: adminId,
        reviewedAt: new Date(),
      }
    });

    await this.auditService.log("admin.report.actioned", adminId, "AdminReport", reportId, actionNote);
    return updated;
  }

  async dismissReport(adminId: string, reportId: string, reason: string) {
    const updated = await prisma.adminReport.update({
      where: { id: reportId },
      data: {
        status: "dismissed",
        reviewedById: adminId,
        reviewedAt: new Date(),
      }
    });

    await this.auditService.log("admin.report.dismissed", adminId, "AdminReport", reportId, reason);
    return updated;
  }

  // ── Analytics Metrics Rollup ─────────────────────────────────────────

  async getMetrics(rangeDays: number = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - rangeDays);

    const metrics = await prisma.platformMetricsDaily.findMany({
      where: { date: { gte: dateLimit } },
      orderBy: { date: "asc" }
    });

    // Fetch the last rollup date time
    const lastRollup = await prisma.platformMetricsDaily.findFirst({
      orderBy: { date: "desc" }
    });

    return {
      lastRollupTime: lastRollup ? lastRollup.createdAt : new Date(),
      metrics: metrics.map(m => ({
        ...m,
        storageBytesUsed: Number(m.storageBytesUsed) // Convert BigInt to number for JSON
      }))
    };
  }

  async runMetricsRollup() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalRepositories,
      totalPushes,
      totalWorkflowRuns
    ] = await Promise.all([
      prisma.user.count(),
      prisma.repository.count(),
      prisma.auditLog.count({ where: { action: { startsWith: 'git.push' } } }),
      prisma.workflow.count() // Mocking runs using configured workflows
    ]);

    // Simple daily delta metric mocks
    const newUsers = 2;
    const newRepositories = 1;
    const storageBytesUsed = BigInt(54289000); // 54.2MB mock platform storage

    return prisma.platformMetricsDaily.upsert({
      where: { date: today },
      create: {
        date: today,
        totalUsers,
        newUsers,
        totalRepositories,
        newRepositories,
        totalPushes,
        totalWorkflowRuns,
        storageBytesUsed
      },
      update: {
        totalUsers,
        newUsers,
        totalRepositories,
        newRepositories,
        totalPushes,
        totalWorkflowRuns,
        storageBytesUsed
      }
    });
  }

  // ── Global Audit Logs Explorer ───────────────────────────────────────

  async listAuditLogs(params: {
    actor?: string;
    action?: string;
    targetType?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit || 50;
    const where: any = {};

    if (params.actor) {
      where.actor = { username: { contains: params.actor, mode: 'insensitive' } };
    }
    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }
    if (params.targetType) {
      where.targetType = params.targetType;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" }
    });

    let nextCursor: string | undefined = undefined;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem?.id;
    }

    return {
      logs,
      nextCursor
    };
  }

  async exportAuditLogsCsv(params: {
    actor?: string;
    action?: string;
    targetType?: string;
  }) {
    // Generate CSV string representation of all matching logs
    const where: any = {};
    if (params.actor) {
      where.actor = { username: { contains: params.actor, mode: 'insensitive' } };
    }
    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }
    if (params.targetType) {
      where.targetType = params.targetType;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { actor: { select: { username: true } } },
      orderBy: { createdAt: "desc" }
    });

    let csvContent = "ID,Timestamp,Actor,Action,Target Type,Target ID,Details\n";
    for (const log of logs) {
      const actorName = log.actor?.username || "System";
      const details = (log.details || "").replace(/"/g, '""');
      csvContent += `"${log.id}","${log.createdAt.toISOString()}","${actorName}","${log.action}","${log.targetType}","${log.targetId}","${details}"\n`;
    }

    return csvContent;
  }
}
