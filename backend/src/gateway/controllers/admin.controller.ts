import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { AdminService } from "../../services/security/admin.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

// User-facing report creation (requires only user login AuthGuard)
@Controller("reports")
@UseGuards(AuthGuard)
export class UserReportController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  createReport(
    @CurrentUser() user: User,
    @Body() dto: { reportedType: string; reportedId: string; reason: string; description?: string }
  ) {
    return this.adminService.createReport(user.id, dto);
  }
}

// Platform Administrator management API endpoints (requires AdminGuard)
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users ──────────────────────────────────────────────────────────

  @Get("users")
  listUsers(@Query("q") q?: string) {
    return this.adminService.listUsers(q);
  }

  @Post("users/:id/suspend")
  suspendUser(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.suspendUser(admin.id, id);
  }

  @Post("users/:id/unsuspend")
  unsuspendUser(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.unsuspendUser(admin.id, id);
  }

  @Post("users/:id/promote")
  promoteAdmin(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.promoteAdmin(admin.id, id);
  }

  @Post("users/:id/demote")
  demoteAdmin(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.demoteAdmin(admin.id, id);
  }

  @Post("users/:id/reset-password")
  forcePasswordReset(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.forcePasswordReset(admin.id, id);
  }

  @Get("users/:id/audit-trail")
  getUserAuditTrail(@Param("id") id: string) {
    return this.adminService.getUserAuditTrail(id);
  }

  // ── Repositories ───────────────────────────────────────────────────

  @Get("repositories")
  listRepositories(@Query("q") q?: string) {
    return this.adminService.listRepositories(q);
  }

  @Post("repositories/:owner/:repo/archive")
  archiveRepository(
    @CurrentUser() admin: User,
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body("reason") reason: string
  ) {
    return this.adminService.archiveRepository(admin.id, owner, repo, reason);
  }

  @Post("repositories/:owner/:repo/unarchive")
  unarchiveRepository(
    @CurrentUser() admin: User,
    @Param("owner") owner: string,
    @Param("repo") repo: string
  ) {
    return this.adminService.unarchiveRepository(admin.id, owner, repo);
  }

  @Post("repositories/:owner/:repo/transfer")
  transferRepository(
    @CurrentUser() admin: User,
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body("newOwner") newOwner: string
  ) {
    return this.adminService.transferRepositoryOwnership(admin.id, owner, repo, newOwner);
  }

  @Delete("repositories/:owner/:repo")
  deleteRepository(
    @CurrentUser() admin: User,
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body("reason") reason: string
  ) {
    return this.adminService.deleteRepository(admin.id, owner, repo, reason);
  }

  // ── Reports ────────────────────────────────────────────────────────

  @Get("reports")
  listReports(@Query("status") status?: string, @Query("type") type?: string) {
    return this.adminService.listReports(status, type);
  }

  @Post("reports/:id/review")
  reviewReport(@CurrentUser() admin: User, @Param("id") id: string) {
    return this.adminService.reviewReport(admin.id, id);
  }

  @Post("reports/:id/action")
  actionReport(
    @CurrentUser() admin: User,
    @Param("id") id: string,
    @Body("actionNote") actionNote: string
  ) {
    return this.adminService.actionReport(admin.id, id, actionNote);
  }

  @Post("reports/:id/dismiss")
  dismissReport(
    @CurrentUser() admin: User,
    @Param("id") id: string,
    @Body("reason") reason: string
  ) {
    return this.adminService.dismissReport(admin.id, id, reason);
  }

  // ── Analytics ──────────────────────────────────────────────────────

  @Get("analytics")
  getMetrics(@Query("range") range?: string) {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return this.adminService.getMetrics(days);
  }

  @Post("analytics/rollup")
  runRollup() {
    return this.adminService.runMetricsRollup();
  }

  // ── Logs ───────────────────────────────────────────────────────────

  @Get("logs")
  listAuditLogs(
    @Query("actor") actor?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string,
    @Query("cursor") cursor?: string
  ) {
    return this.adminService.listAuditLogs({ actor, action, targetType, cursor });
  }

  @Get("logs/export")
  async exportAuditLogsCsv(
    @Res() res: Response,
    @Query("actor") actor?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string
  ) {
    const csvContent = await this.adminService.exportAuditLogsCsv({ actor, action, targetType });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="admin_audit_logs.csv"');
    res.status(200).send(csvContent);
  }
}
