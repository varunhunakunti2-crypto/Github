import { Injectable } from "@nestjs/common";

@Injectable()
export class GitObjectService {
  async getBlob(repoId: string, sha: string) { return null; }
  async getTree(repoId: string, sha: string) { return null; }
  async getCommit(repoId: string, sha: string) { return null; }
}
