import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class NotificationService {
  
  // List notifications for recipient
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { recipientId: userId },
      include: {
        sender: { select: { username: true, avatarUrl: true } },
        repository: { select: { name: true, organizationId: true, ownerId: true, organization: { select: { slug: true } }, owner: { select: { username: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  // Toggle read status
  async markRead(id: string, userId: string, isRead: boolean) {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Unauthorized");
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead }
    });
  }

  // Bulk mark all notifications as read
  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true }
    });
    return { message: "All notifications marked as read" };
  }

  // Delete notification
  async remove(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Unauthorized");
    }

    await prisma.notification.delete({
      where: { id }
    });
    return { message: "Notification deleted" };
  }

  // Unsubscribe / Mute thread-level notifications
  async updateSubscription(id: string, userId: string, isUnsubscribed: boolean) {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Unauthorized");
    }

    // Set all notifications for this thread as unsubscribed for this user
    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        notifiableType: notification.notifiableType,
        notifiableId: notification.notifiableId
      },
      data: { isUnsubscribed }
    });

    return { message: isUnsubscribed ? "Thread muted" : "Thread unmuted" };
  }

  async unsubscribeThreadDirect(notifiableType: string, notifiableId: string, userId: string) {
    // Check if there is an existing notification for this thread to update
    const existing = await prisma.notification.findFirst({
      where: { recipientId: userId, notifiableType, notifiableId }
    });

    if (existing) {
      await prisma.notification.updateMany({
        where: { recipientId: userId, notifiableType, notifiableId },
        data: { isUnsubscribed: true }
      });
    } else {
      // If none, we can create a dummy notification marked as read and unsubscribed to register the mute state
      // (This will prevent future dispatches since dispatch checks for isUnsubscribed: true)
      await prisma.notification.create({
        data: {
          recipientId: userId,
          senderId: userId, // self-reference for dummy
          // Let's find first repository or use dummy
          repositoryId: (await prisma.repository.findFirst())?.id || "",
          notifiableType,
          notifiableId,
          reason: "subscribed",
          title: "Muted Thread",
          body: "Muted",
          url: "",
          isRead: true,
          isUnsubscribed: true
        }
      });
    }

    return { message: "Unsubscribed from thread successfully" };
  }

  async getActivityFeed() {
    return [];
  }
}
