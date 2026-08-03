import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import * as crypto from "crypto";
import { NotificationDispatchService } from "../notification/notification-dispatch.service";
import { AuditService } from "./audit.service";

@Injectable()
export class TokenService {
  constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string) {
    // Audit expiring-soon tokens when user lists them
    try {
      const expiringTokens = await prisma.personalAccessToken.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
            lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expiring in 7 days
          },
        },
      });

      for (const pat of expiringTokens) {
        // Check if we already notified the user
        const existingNotif = await prisma.notification.findFirst({
          where: {
            recipientId: userId,
            title: `Token expiring soon: ${pat.name}`,
          },
        });

        if (!existingNotif) {
          // Find first repository of the user to hook the notification (since repositoryId is required)
          const repo = await prisma.repository.findFirst({
            where: { ownerId: userId },
          });

          if (repo) {
            await this.notificationDispatchService.dispatch({
              recipientId: userId,
              senderId: userId,
              repositoryId: repo.id,
              notifiableType: "Organization",
              notifiableId: pat.id,
              reason: "SUBSCRIBED",
              title: `Token expiring soon: ${pat.name}`,
              body: `Your personal access token "${pat.name}" is expiring soon on ${pat.expiresAt?.toLocaleDateString()}. Please generate a replacement.`,
              url: "/settings/tokens",
            });
          }
        }
      }
    } catch (err) {
      console.error("Expiring soon token check failed", err);
    }

    return prisma.personalAccessToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, dto: any) {
    const rawToken = `gitforge_pat_${crypto.randomBytes(20).toString("hex")}`;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : null;

    const pat = await prisma.personalAccessToken.create({
      data: {
        userId,
        name: dto.name,
        tokenHash,
        scopes: dto.scopes || [],
        expiresAt,
      },
    });

    await this.auditService.log("token.create", userId, "PersonalAccessToken", pat.id);

    return {
      ...pat,
      raw_token: rawToken,
    };
  }

  async revoke(userId: string, id: string) {
    const pat = await prisma.personalAccessToken.findUnique({
      where: { id },
    });

    if (!pat || pat.userId !== userId) {
      throw new NotFoundException("Token not found");
    }

    await prisma.personalAccessToken.delete({
      where: { id },
    });

    await this.auditService.log("token.revoke", userId, "PersonalAccessToken", id);

    return { message: "token-revoked" };
  }
}
