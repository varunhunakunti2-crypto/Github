import { Injectable } from "@nestjs/common";

@Injectable()
export class LabelService {
  async listLabels(owner: string, repo: string) { return []; }
  async createLabel(owner: string, repo: string, dto: any) { return { message: "label-created" }; }
  async listMilestones(owner: string, repo: string) { return []; }
  async createMilestone(owner: string, repo: string, dto: any) { return { message: "milestone-created" }; }
}
