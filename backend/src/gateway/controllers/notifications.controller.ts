import { Controller, Get, Put, Param } from "@nestjs/common";
import { NotificationService } from "../../services/notification/notification.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list() { return this.notificationService.list(); }

  @Put(":id/read")
  markRead(@Param("id") id: string) { return this.notificationService.markRead(id); }

  @Put("read-all")
  markAllRead() { return this.notificationService.markAllRead(); }
}
