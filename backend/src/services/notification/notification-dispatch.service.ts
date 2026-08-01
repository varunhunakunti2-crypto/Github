import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { EmailService } from "../email/email.service";
import { Subject } from "rxjs";

// Shared event stream to push notifications to WebSockets cleanly
export const notificationEvents$ = new Subject<any>();

export interface NotificationEvent {
  recipientId: string;
  senderId: string;
  repositoryId: string;
  notifiableType: "Issue" | "PullRequest" | "Discussion" | "Organization";
  notifiableId: string;
  reason: "MENTION" | "ASSIGN" | "REVIEW_REQUESTED" | "SUBSCRIBED" | "PR_MERGED" | "DISCUSSION_REPLY";
  title: string;
  body: string;
  url: string;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(private readonly emailService: EmailService) {}

  async dispatch(event: NotificationEvent) {
    // 1. Never notify a user about their own actions
    if (event.senderId === event.recipientId) {
      return;
    }

    try {
      // 2. Respect Thread Unsubscribe / Mute State
      const isMuted = await prisma.notification.findFirst({
        where: {
          recipientId: event.recipientId,
          notifiableType: event.notifiableType,
          notifiableId: event.notifiableId,
          isUnsubscribed: true
        }
      });
      if (isMuted) {
        this.logger.log(`Skipped notification: thread ${event.notifiableType}:${event.notifiableId} is muted by user.`);
        return;
      }

      // 3. Deduplication Check (within 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentDup = await prisma.notification.findFirst({
        where: {
          recipientId: event.recipientId,
          notifiableType: event.notifiableType,
          notifiableId: event.notifiableId,
          reason: event.reason,
          createdAt: { gte: oneMinuteAgo }
        }
      });
      if (recentDup) {
        this.logger.log("Skipped notification: duplicate event detected in last 1 minute.");
        return;
      }

      // 4. Create Notification in Database
      const notification = await prisma.notification.create({
        data: {
          recipientId: event.recipientId,
          senderId: event.senderId,
          repositoryId: event.repositoryId,
          notifiableType: event.notifiableType,
          notifiableId: event.notifiableId,
          reason: event.reason,
          title: event.title,
          body: event.body,
          url: event.url
        },
        include: {
          sender: { select: { username: true } },
          repository: { select: { name: true } }
        }
      });

      this.logger.log(`Created in-app notification: id=${notification.id} for user=${event.recipientId}`);

      // 5. Emit Real-time WebSockets event
      notificationEvents$.next(notification);

      // 6. Handle Email Notification preferences
      const recipient = await prisma.user.findUnique({
        where: { id: event.recipientId }
      });
      if (!recipient || recipient.notificationPreference === "OFF") {
        return;
      }

      if (recipient.notificationPreference === "IMMEDIATE") {
        // Parametrize email body based on reason
        const subject = `[GitForge] ${event.title}`;
        const emailBody = `
Hi @${recipient.username},

You received a notification on GitForge:

Event: ${event.title}
Reason: ${event.reason.toLowerCase().replace("_", " ")}
Repository: ${notification.repository.name}

Message:
"${event.body}"

View it here: http://localhost:3000${event.url}

---
To unsubscribe from this thread, click here: http://localhost:3000/api/v1/notifications/unsubscribe-email?notifiableType=${event.notifiableType}&notifiableId=${event.notifiableId}&userId=${recipient.id}
`;

        await this.emailService.sendNotificationEmail(recipient.email, subject, emailBody);
        this.logger.log(`Dispatched immediate notification email to ${recipient.email}`);
      }
    } catch (e: any) {
      this.logger.error(`Failed to dispatch notification: ${e.message}`, e.stack);
    }
  }
}
