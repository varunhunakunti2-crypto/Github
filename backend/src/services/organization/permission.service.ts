import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { CacheService } from "../security/cache.service";

@Injectable()
export class PermissionService {
  constructor(private readonly cache: CacheService) {}

  async getCollaborators(repoId: string) {
    const perms = await prisma.permission.findMany({
      where: { repositoryId: repoId, granteeType: "USER" },
      include: {
        // We will mock or query user details if needed
      }
    });
    // For simplicity, query the users directly
    const userIds = perms.map(p => p.granteeId);
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, avatarUrl: true }
    });
  }

  async addCollaborator(repoId: string, userId: string, accessLevel: string) {
    await prisma.permission.upsert({
      where: {
        repositoryId_granteeType_granteeId: {
          repositoryId: repoId,
          granteeType: "USER",
          granteeId: userId
        }
      },
      update: { accessLevel: accessLevel as any },
      create: {
        repositoryId: repoId,
        granteeType: "USER",
        granteeId: userId,
        accessLevel: accessLevel as any
      }
    });

    // Invalidate permission cache for this user
    await this.cache.del(`perms:user:${userId}:repo:${repoId}`);
    return { message: "collaborator-added" };
  }

  async removeCollaborator(repoId: string, userId: string) {
    await prisma.permission.deleteMany({
      where: {
        repositoryId: repoId,
        granteeType: "USER",
        granteeId: userId
      }
    });

    // Invalidate permission cache for this user
    await this.cache.del(`perms:user:${userId}:repo:${repoId}`);
    return { message: "collaborator-removed" };
  }

  async checkAccess(userId: string, repoId: string): Promise<{ access_level: string }> {
    const cacheKey = `perms:user:${userId}:repo:${repoId}`;
    const cached = await this.cache.get<{ access_level: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Fetch Repository info
    const repo = await prisma.repository.findUnique({
      where: { id: repoId }
    });

    if (!repo) {
      return { access_level: "NONE" };
    }

    // 2. If user is the direct repository owner, they are ADMIN
    if (repo.ownerId === userId) {
      const res = { access_level: "ADMIN" };
      await this.cache.set(cacheKey, res, 600); // 10 minutes cache
      return res;
    }

    // 3. Check direct permissions
    const directPerm = await prisma.permission.findFirst({
      where: {
        repositoryId: repoId,
        granteeType: "USER",
        granteeId: userId
      }
    });

    if (directPerm) {
      const res = { access_level: directPerm.accessLevel };
      await this.cache.set(cacheKey, res, 600);
      return res;
    }

    // 4. Check Organization ownership
    if (repo.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: repo.organizationId,
          userId: userId
        }
      });

      if (orgMember) {
        if (orgMember.role === "OWNER") {
          const res = { access_level: "ADMIN" };
          await this.cache.set(cacheKey, res, 600);
          return res;
        }

        // Check Team permissions
        const userTeams = await prisma.teamMember.findMany({
          where: { userId: userId },
          select: { teamId: true }
        });
        const teamIds = userTeams.map(ut => ut.teamId);

        if (teamIds.length > 0) {
          const teamPerms = await prisma.permission.findMany({
            where: {
              repositoryId: repoId,
              granteeType: "TEAM",
              granteeId: { in: teamIds }
            }
          });

          if (teamPerms.length > 0) {
            // Find highest permission level
            const levels = ["READ", "TRIAGE", "WRITE", "MAINTAIN", "ADMIN"];
            let highest = "READ";
            for (const tp of teamPerms) {
              if (levels.indexOf(tp.accessLevel) > levels.indexOf(highest)) {
                highest = tp.accessLevel;
              }
            }
            const res = { access_level: highest };
            await this.cache.set(cacheKey, res, 600);
            return res;
          }
        }
      }
    }

    // 5. Fallback for public repository read access
    if (!repo.isPrivate) {
      const res = { access_level: "READ" };
      await this.cache.set(cacheKey, res, 600);
      return res;
    }

    const res = { access_level: "NONE" };
    await this.cache.set(cacheKey, res, 600);
    return res;
  }
}

