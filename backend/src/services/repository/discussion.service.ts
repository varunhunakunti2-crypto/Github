import { Injectable } from "@nestjs/common";

@Injectable()
export class DiscussionService {
  async list(owner: string, repo: string) { return []; }
  async create(owner: string, repo: string, dto: any) { return { message: "discussion-created" }; }
}
