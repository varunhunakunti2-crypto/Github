import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class TeamService {
  private async getOrgAndCheckMembership(orgSlug: string, userId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: true }
    });
    if (!org) {
      throw new NotFoundException("Organization not found");
    }
    const memberRecord = org.members.find(m => m.userId === userId);
    if (!memberRecord) {
      throw new ForbiddenException("Access denied. You are not a member of this organization.");
    }
    return { org, isOwner: memberRecord.role === "OWNER" };
  }

  async list(orgSlug: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    
    const teams = await prisma.team.findMany({
      where: { organizationId: org.id },
      include: {
        parentTeam: { select: { id: true, name: true, slug: true } },
        members: { include: { user: { select: { id: true, username: true } } } }
      }
    });

    return teams.filter(team => {
      if (team.privacy === "VISIBLE" || isOwner) return true;
      return team.members.some(m => m.userId === userId);
    });
  }

  async create(orgSlug: string, dto: any, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    if (!isOwner) {
      throw new ForbiddenException("Only organization owners can create teams");
    }

    const { name, slug, privacy, parentTeamId } = dto;
    if (!name || !slug) {
      throw new ConflictException("Missing name or slug");
    }

    // Check slug uniqueness within org
    const existing = await prisma.team.findUnique({
      where: {
        organizationId_slug: { organizationId: org.id, slug }
      }
    });
    if (existing) {
      throw new ConflictException("Team slug already exists in this organization");
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        privacy: privacy || "VISIBLE",
        organizationId: org.id,
        parentTeamId: parentTeamId || null,
        members: {
          create: {
            userId: userId,
            role: "MAINTAINER"
          }
        }
      }
    });

    return team;
  }

  async findOne(orgSlug: string, teamSlug: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug },
      include: {
        parentTeam: true,
        childTeams: true,
        members: {
          include: {
            user: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } }
          }
        }
      }
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const isTeamMember = team.members.some(m => m.userId === userId);
    if (team.privacy === "SECRET" && !isOwner && !isTeamMember) {
      throw new ForbiddenException("Access denied to secret team");
    }

    const myTeamMember = team.members.find(m => m.userId === userId);
    const myTeamRole = myTeamMember ? myTeamMember.role : null;

    const permissions = await prisma.permission.findMany({
      where: { granteeId: team.id, granteeType: "TEAM" },
      include: { repository: true }
    });

    return {
      ...team,
      myTeamRole,
      repositories: permissions.map(p => ({
        ...p.repository,
        accessLevel: p.accessLevel
      }))
    };
  }

  async update(orgSlug: string, teamSlug: string, dto: any, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug },
      include: { members: true }
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const isMaintainer = team.members.some(m => m.userId === userId && m.role === "MAINTAINER");
    if (!isOwner && !isMaintainer) {
      throw new ForbiddenException("Only team maintainers or organization owners can edit team settings");
    }

    const updated = await prisma.team.update({
      where: { id: team.id },
      data: {
        name: dto.name,
        privacy: dto.privacy,
        parentTeamId: dto.parentTeamId === "" ? null : dto.parentTeamId
      }
    });

    return updated;
  }

  async delete(orgSlug: string, teamSlug: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    if (!isOwner) {
      throw new ForbiddenException("Only organization owners can delete teams");
    }

    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug }
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    await prisma.team.delete({
      where: { id: team.id }
    });

    return { message: "Team deleted successfully" };
  }

  async addMember(orgSlug: string, teamSlug: string, username: string, role: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug },
      include: { members: true }
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const isMaintainer = team.members.some(m => m.userId === userId && m.role === "MAINTAINER");
    if (!isOwner && !isMaintainer) {
      throw new ForbiddenException("Only team maintainers or organization owners can add members");
    }

    const targetUser = await prisma.user.findUnique({
      where: { username }
    });
    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const isOrgMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: targetUser.id } }
    });
    if (!isOrgMember) {
      throw new ForbiddenException("User must be added to organization before being added to team");
    }

    const teamMember = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
      update: { role: (role as any) || "MEMBER" },
      create: {
        teamId: team.id,
        userId: targetUser.id,
        role: (role as any) || "MEMBER"
      }
    });

    return teamMember;
  }

  async removeMember(orgSlug: string, teamSlug: string, username: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug },
      include: { members: { include: { user: true } } }
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const isMaintainer = team.members.some(m => m.userId === userId && m.role === "MAINTAINER");
    if (!isOwner && !isMaintainer) {
      throw new ForbiddenException("Only team maintainers or organization owners can remove members");
    }

    const targetMember = team.members.find(m => m.user.username === username);
    if (!targetMember) {
      throw new NotFoundException("Member not found in team");
    }

    await prisma.teamMember.delete({
      where: { id: targetMember.id }
    });

    return { message: "Member removed from team successfully" };
  }

  async grantRepoAccess(orgSlug: string, teamSlug: string, repoName: string, permission: string, userId: string) {
    const { org, isOwner } = await this.getOrgAndCheckMembership(orgSlug, userId);
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, slug: teamSlug },
      include: { members: true }
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const isMaintainer = team.members.some(m => m.userId === userId && m.role === "MAINTAINER");
    if (!isOwner && !isMaintainer) {
      throw new ForbiddenException("Only team maintainers or organization owners can grant repo access");
    }

    const repo = await prisma.repository.findFirst({
      where: { organizationId: org.id, name: repoName }
    });

    if (!repo) {
      throw new NotFoundException("Repository not found under this organization");
    }

    const perm = await prisma.permission.upsert({
      where: {
        repositoryId_granteeType_granteeId: {
          repositoryId: repo.id,
          granteeType: "TEAM",
          granteeId: team.id
        }
      },
      update: { accessLevel: permission as any },
      create: {
        repositoryId: repo.id,
        granteeType: "TEAM",
        granteeId: team.id,
        accessLevel: permission as any
      }
    });

    return perm;
  }
}
