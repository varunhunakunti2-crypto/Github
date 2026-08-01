import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { EmailServiceModule } from "../email/email.module";

@Module({
  imports: [EmailServiceModule],
  providers: [NotificationService, NotificationDispatchService],
  exports: [NotificationService, NotificationDispatchService],
})
export class NotificationServiceModule {}
