import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class RepositoryService {
  async create(dto: any) { return { message: "repo-created" }; }
  async findOne(owner: string, repo: string) { return { owner, repo }; }
  async update(owner: string, repo: string, dto: any) { return { message: "updated" }; }
  async remove(owner: string, repo: string) { return { message: "deleted" }; }
  async fork(owner: string, repo: string) { return { message: "forked" }; }
  async star(owner: string, repo: string) { return { message: "starred" }; }
  
  async getCollaborators(owner: string, repo: string) {
    return prisma.user.findMany({
      select: { id: true, username: true, email: true, avatarUrl: true }
    });
  }
}
