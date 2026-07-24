import { Injectable } from "@nestjs/common";

@Injectable()
export class BranchService {
  async list(owner: string, repo: string) { return []; }
  async create(owner: string, repo: string, dto: any) { return { message: "branch-created" }; }
  async remove(owner: string, repo: string, branch: string) { return { message: "branch-deleted" }; }
}
