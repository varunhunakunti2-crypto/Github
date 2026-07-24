import { Injectable } from "@nestjs/common";

@Injectable()
export class ProjectService {
  async listProjects(owner: string, repo: string) { return []; }
  async createProject(dto: any) { return { message: "project-created" }; }
}
