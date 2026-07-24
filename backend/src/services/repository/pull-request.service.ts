import { Injectable } from "@nestjs/common";

@Injectable()
export class PullRequestService {
  async list(owner: string, repo: string) { return []; }
  async create(owner: string, repo: string, dto: any) { return { message: "pr-created" }; }
  async findOne(owner: string, repo: string, number: number) { return { number }; }
  async merge(owner: string, repo: string, number: number, dto: any) { return { message: "pr-merged" }; }
}
