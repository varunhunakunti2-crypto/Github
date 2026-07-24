import { Injectable } from "@nestjs/common";

@Injectable()
export class TeamService {
  async create(orgSlug: string, dto: any) { return { message: "team-created" }; }
  async addMember(teamId: string, userId: string) { return { message: "member-added" }; }
  async removeMember(teamId: string, userId: string) { return { message: "member-removed" }; }
}
