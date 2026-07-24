import { Injectable } from "@nestjs/common";

@Injectable()
export class JobService {
  async listJobs(runId: string) { return []; }
  async getJobLogs(jobId: string) { return ""; }
}
