import { Injectable } from "@nestjs/common";

@Injectable()
export class WebhookService {
  async list(repoId: string) { return []; }
  async create(repoId: string, dto: any) { return { message: "webhook-created" }; }
  async delete(webhookId: string) { return { message: "webhook-deleted" }; }
  async dispatch(webhookId: string, event: string, payload: any) { return { message: "dispatched" }; }
}
