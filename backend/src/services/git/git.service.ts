import { Injectable } from "@nestjs/common";

@Injectable()
export class GitService {
  async clone(repoId: string) { return { message: "cloned" }; }
  async push(repoId: string) { return { message: "pushed" }; }
  async pull(repoId: string) { return { message: "pulled" }; }
  async diff(repoId: string, base: string, head: string) { return { base, head }; }
}
