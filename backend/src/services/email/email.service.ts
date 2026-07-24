import { Injectable } from "@nestjs/common";

@Injectable()
export class EmailService {
  async sendVerificationEmail(email: string, token: string) { return { message: "verification-sent" }; }
  async sendPasswordResetEmail(email: string, token: string) { return { message: "reset-sent" }; }
  async sendNotificationEmail(email: string, subject: string, body: string) { return { message: "notification-sent" }; }
}
