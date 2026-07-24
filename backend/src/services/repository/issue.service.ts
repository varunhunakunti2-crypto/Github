import { Injectable } from "@nestjs/common";

@Injectable()
export class IssueService {
  async list(owner: string, repo: string) { return []; }
  async create(owner: string, repo: string, dto: any) { return { message: "issue-created" }; }
  async findOne(owner: string, repo: string, number: number) { return { number }; }
  async update(owner: string, repo: string, number: number, dto: any) { return { message: "issue-updated" }; }
}
