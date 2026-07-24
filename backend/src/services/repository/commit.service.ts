import { Injectable } from "@nestjs/common";

@Injectable()
export class CommitService {
  async list(owner: string, repo: string) { return []; }
  async findOne(owner: string, repo: string, sha: string) { return { sha }; }
  async compare(owner: string, repo: string, base: string, head: string) { return { base, head }; }
}
