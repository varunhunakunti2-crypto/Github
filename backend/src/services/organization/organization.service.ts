import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import * as crypto from "crypto";
import { EmailService } from "../email/email.service";

@Injectable()
export class OrganizationService {
  constructor(private readonly emailService: EmailService) {}
  async create(dto: any, creatorUserId: string) {
    const { name, slug, billingEmail } = dto;
    if (!name || !slug || !billingEmail) {
      throw new ConflictException("Missing required fields");
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });
    if (existing) {
      throw new ConflictException("Slug is already taken");
    }

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        billingEmail,
        ownerId: creatorUserId,
        members: {
          create: {
            userId: creatorUserId,
            role: "OWNER"
          }
        }
      }
    });

    return org;
  }

  async checkSlug(slug: string) {
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });
    return { available: !existing };
  }

  async findOne(slug: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, email: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Check if user is a member of the organization
    const isMember = org.members.some(m => m.userId === currentUserId);
    // Find current user's role
    const myMemberRecord = org.members.find(m => m.userId === currentUserId);
    const myRole = myMemberRecord ? myMemberRecord.role : null;

    return {
      ...org,
      isMember,
      myRole
    };
  }

  async update(slug: string, dto: any, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: true }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Check if owner
    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can update organization settings");
    }

    const updated = await prisma.organization.update({
      where: { slug },
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        billingEmail: dto.billingEmail
      }
    });

    return updated;
  }

  async delete(slug: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: true }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can delete the organization");
    }

    await prisma.organization.delete({
      where: { slug }
    });

    return { message: "Organization deleted successfully" };
  }

  async getMembers(slug: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, email: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Member check
    const isMember = org.members.some(m => m.userId === currentUserId);
    if (!isMember) {
      throw new ForbiddenException("Access denied. You must be a member of the organization.");
    }

    return org.members;
  }

  async removeMember(slug: string, targetUsername: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Owner check
    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can remove members");
    }

    const targetMember = org.members.find(m => m.user.username === targetUsername);
    if (!targetMember) {
      throw new NotFoundException("Member not found in organization");
    }

    // Prevent removing the sole owner or self if sole owner
    if (targetMember.role === "OWNER") {
      const owners = org.members.filter(m => m.role === "OWNER");
      if (owners.length <= 1) {
        throw new ForbiddenException("Cannot remove the only owner");
      }
    }

    await prisma.organizationMember.delete({
      where: { id: targetMember.id }
    });

    return { message: "Member removed successfully" };
  }

  async updateMemberRole(slug: string, targetUsername: string, role: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can update member roles");
    }

    const targetMember = org.members.find(m => m.user.username === targetUsername);
    if (!targetMember) {
      throw new NotFoundException("Member not found in organization");
    }

    // Enforce role type safety
    if (role !== "OWNER" && role !== "MEMBER" && role !== "BILLING_MANAGER") {
      throw new ConflictException("Invalid role");
    }

    // Prevent changing role of sole owner
    if (targetMember.role === "OWNER" && role !== "OWNER") {
      const owners = org.members.filter(m => m.role === "OWNER");
      if (owners.length <= 1) {
        throw new ForbiddenException("Cannot demote the only owner");
      }
    }

    await prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: { role: role as any }
    });

    return { message: "Member role updated successfully" };
  }

  async inviteMember(slug: string, emailOrUsername: string, role: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can invite members");
    }

    if (role !== "OWNER" && role !== "MEMBER" && role !== "BILLING_MANAGER") {
      throw new ConflictException("Invalid role");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Try to find as username
    const targetUser = await prisma.user.findUnique({
      where: { username: emailOrUsername }
    });

    if (targetUser) {
      const isAlreadyMember = org.members.some(m => m.userId === targetUser.id);
      if (isAlreadyMember) {
        throw new ConflictException("User is already a member of this organization");
      }

      const existingInvite = await prisma.invitation.findFirst({
        where: { organizationId: org.id, invitedUserId: targetUser.id, status: "PENDING" }
      });
      if (existingInvite) {
        throw new ConflictException("Active invitation already exists for this user");
      }

      const invite = await prisma.invitation.create({
        data: {
          organizationId: org.id,
          invitedUserId: targetUser.id,
          invitedEmail: targetUser.email,
          invitedById: currentUserId,
          role: role as any,
          status: "PENDING",
          token,
          expiresAt
        }
      });

      console.log(`Notification sent to user ${targetUser.username} for org invite: ${token}`);
      await this.emailService.sendNotificationEmail(
        targetUser.email,
        `You have been invited to join ${org.name} on GitForge`,
        `You have been invited to join the organization ${org.name} as a ${role.toLowerCase()}. Accept the invite here: http://localhost:3000/invitations/${token}`
      );

      return invite;
    } else {
      if (!emailOrUsername.includes("@")) {
        throw new ConflictException("Invalid username or email format");
      }

      const existingInvite = await prisma.invitation.findFirst({
        where: { organizationId: org.id, invitedEmail: emailOrUsername, status: "PENDING" }
      });
      if (existingInvite) {
        throw new ConflictException("Active invitation already exists for this email");
      }

      const invite = await prisma.invitation.create({
        data: {
          organizationId: org.id,
          invitedEmail: emailOrUsername,
          invitedById: currentUserId,
          role: role as any,
          status: "PENDING",
          token,
          expiresAt
        }
      });

      await this.emailService.sendNotificationEmail(
        emailOrUsername,
        `You have been invited to join ${org.name} on GitForge`,
        `You have been invited to join the organization ${org.name} as a ${role.toLowerCase()}. Accept or sign up and accept here: http://localhost:3000/invitations/${token}`
      );

      return invite;
    }
  }

  async getInvitations(slug: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: true }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isMember = org.members.some(m => m.userId === currentUserId);
    if (!isMember) {
      throw new ForbiddenException("Access denied. You must be a member.");
    }

    return await prisma.invitation.findMany({
      where: { organizationId: org.id, status: "PENDING" },
      include: {
        invitedUser: { select: { id: true, username: true, name: true, avatarUrl: true } },
        invitedBy: { select: { id: true, username: true } }
      }
    });
  }

  async revokeInvitation(slug: string, invitationId: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: true }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isOwner = org.members.some(m => m.userId === currentUserId && m.role === "OWNER");
    if (!isOwner) {
      throw new ForbiddenException("Only owners can revoke invitations");
    }

    const invite = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!invite || invite.organizationId !== org.id) {
      throw new NotFoundException("Invitation not found");
    }

    await prisma.invitation.delete({
      where: { id: invitationId }
    });

    return { message: "Invitation revoked successfully" };
  }

  async getInvitationByToken(token: string) {
    const invite = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        invitedBy: { select: { id: true, username: true, name: true } }
      }
    });

    if (!invite) {
      throw new NotFoundException("Invitation not found");
    }

    const isExpired = new Date() > invite.expiresAt;
    return {
      id: invite.id,
      orgName: invite.organization.name,
      orgSlug: invite.organization.slug,
      role: invite.role,
      invitedBy: invite.invitedBy.username,
      status: invite.status,
      isExpired
    };
  }

  async acceptInvitation(token: string, currentUserId: string) {
    const invite = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invite) {
      throw new NotFoundException("Invitation not found");
    }

    if (invite.status !== "PENDING") {
      throw new ConflictException(`Invitation is already ${invite.status.toLowerCase()}`);
    }

    if (new Date() > invite.expiresAt) {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      });
      throw new ConflictException("Invitation has expired");
    }

    if (invite.invitedUserId && invite.invitedUserId !== currentUserId) {
      throw new ForbiddenException("This invitation was sent to a different user");
    }

    const existingMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: currentUserId } }
    });

    if (existingMember) {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" }
      });
      return { message: "You are already a member of this organization", orgSlug: invite.organization.slug };
    }

    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: currentUserId,
          role: invite.role
        }
      }),
      prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" }
      })
    ]);

    return { message: "Invitation accepted. Welcome to the organization!", orgSlug: invite.organization.slug };
  }

  async declineInvitation(token: string, currentUserId: string) {
    const invite = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invite) {
      throw new NotFoundException("Invitation not found");
    }

    if (invite.status !== "PENDING") {
      throw new ConflictException(`Invitation is already ${invite.status.toLowerCase()}`);
    }

    if (invite.invitedUserId && invite.invitedUserId !== currentUserId) {
      throw new ForbiddenException("This invitation was sent to a different user");
    }

    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "DECLINED" }
    });

    return { message: "Invitation declined" };
  }

  async getRepositories(slug: string, currentUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: true }
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const memberRecord = org.members.find(m => m.userId === currentUserId);
    const isMember = !!memberRecord;
    const isOwner = memberRecord?.role === "OWNER";

    const repos = await prisma.repository.findMany({
      where: { organizationId: org.id },
      include: {
        owner: { select: { username: true } },
        organization: { select: { slug: true } },
        permissions: true
      }
    });

    const visibleRepos = [];
    for (const repo of repos) {
      if (!repo.isPrivate) {
        visibleRepos.push(repo);
        continue;
      }

      if (isOwner) {
        visibleRepos.push(repo);
        continue;
      }

      if (!isMember) {
        continue;
      }

      const hasDirectPermission = repo.permissions.some(
        p => p.granteeType === "USER" && p.granteeId === currentUserId
      );
      if (hasDirectPermission) {
        visibleRepos.push(repo);
        continue;
      }

      const teamGrantees = repo.permissions
        .filter(p => p.granteeType === "TEAM")
        .map(p => p.granteeId);

      if (teamGrantees.length > 0) {
        const userTeams = await prisma.teamMember.findMany({
          where: {
            userId: currentUserId,
            teamId: { in: teamGrantees }
          }
        });
        if (userTeams.length > 0) {
          visibleRepos.push(repo);
        }
      }
    }

    return visibleRepos;
  }
}
