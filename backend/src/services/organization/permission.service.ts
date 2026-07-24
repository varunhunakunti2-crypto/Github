import { Injectable } from "@nestjs/common";

@Injectable()
export class PermissionService {
  async getCollaborators(repoId: string) { return []; }
  async addCollaborator(repoId: string, userId: string, accessLevel: string) { return { message: "collaborator-added" }; }
  async removeCollaborator(repoId: string, userId: string) { return { message: "collaborator-removed" }; }
  async checkAccess(userId: string, repoId: string) { return { access_level: "read" }; }
}
