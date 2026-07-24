import { Injectable } from "@nestjs/common";

@Injectable()
export class WorkflowService {
  async list(owner: string, repo: string) { return []; }
  async listRuns(owner: string, repo: string) { return []; }
  async getRun(owner: string, repo: string, runId: string) { return { runId }; }
  async rerun(owner: string, repo: string, runId: string) { return { message: "rerun" }; }
}
