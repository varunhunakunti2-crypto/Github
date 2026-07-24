import { Controller, Get } from "@nestjs/common";
import { NotificationService } from "../../services/notification/notification.service";

@Controller("activity")
export class ActivityController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get("feed")
  getFeed() { return this.notificationService.getActivityFeed(); }
}
