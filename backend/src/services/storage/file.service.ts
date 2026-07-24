import { Injectable } from "@nestjs/common";

@Injectable()
export class FileService {
  async getFileTree(repoId: string, commitId: string, path: string) { return []; }
  async getFileContent(repoId: string, commitId: string, path: string) { return null; }
}
