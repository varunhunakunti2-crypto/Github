import { Controller, Get, Put, Patch, Delete, Param, Body, Query, UseGuards, Res } from "@nestjs/common";
import { NotificationService } from "../../services/notification/notification.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";
import { Response } from "express";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@CurrentUser() user: User) {
    return this.notificationService.list(user.id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  markRead(
    @Param("id") id: string,
    @Body("isRead") isRead: boolean,
    @CurrentUser() user: User
  ) {
    return this.notificationService.markRead(id, user.id, isRead);
  }

  @Put("read")
  @UseGuards(AuthGuard)
  markAllRead(@CurrentUser() user: User) {
    return this.notificationService.markAllRead(user.id);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.notificationService.remove(id, user.id);
  }

  @Put(":id/subscription")
  @UseGuards(AuthGuard)
  updateSubscription(
    @Param("id") id: string,
    @Body("isUnsubscribed") isUnsubscribed: boolean,
    @CurrentUser() user: User
  ) {
    return this.notificationService.updateSubscription(id, user.id, isUnsubscribed);
  }

  // Public direct link from notification emails to unsubscribe/mute a thread
  @Get("unsubscribe-email")
  async unsubscribeEmail(
    @Query("notifiableType") notifiableType: string,
    @Query("notifiableId") notifiableId: string,
    @Query("userId") userId: string,
    @Res() res: Response
  ) {
    await this.notificationService.unsubscribeThreadDirect(notifiableType, notifiableId, userId);
    
    // Return a sleek GitForge themed success message page
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - GitForge</title>
        <style>
          body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #111827;
            border: 1px solid #1f2937;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
          }
          h1 {
            font-size: 1.5rem;
            color: #6366f1;
            margin-top: 0;
          }
          p {
            font-size: 0.875rem;
            color: #9ca3af;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Unsubscribed Successfully</h1>
          <p>You have been unsubscribed from notifications for this thread. You will no longer receive emails or updates for this specific discussion or issue.</p>
        </div>
      </body>
      </html>
    `);
  }
}
