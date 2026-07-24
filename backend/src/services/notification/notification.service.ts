import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationService {
  async list() { return []; }
  async markRead(id: string) { return { message: "marked-read" }; }
  async markAllRead() { return { message: "all-marked-read" }; }
  async getActivityFeed() { return []; }
}
