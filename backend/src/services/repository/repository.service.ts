import { Injectable } from "@nestjs/common";

@Injectable()
export class RepositoryService {
  async create(dto: any) { return { message: "repo-created" }; }
  async findOne(owner: string, repo: string) { return { owner, repo }; }
  async update(owner: string, repo: string, dto: any) { return { message: "updated" }; }
  async remove(owner: string, repo: string) { return { message: "deleted" }; }
  async fork(owner: string, repo: string) { return { message: "forked" }; }
  async star(owner: string, repo: string) { return { message: "starred" }; }
}
