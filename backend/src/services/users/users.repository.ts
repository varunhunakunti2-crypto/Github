import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersRepository {
  async findByUsername(username: string) { return null; }
  async findById(id: string) { return null; }
  async update(id: string, data: any) { return null; }
  async getFollowers(userId: string) { return []; }
  async getFollowing(userId: string) { return []; }
  async getStarredRepos(userId: string) { return []; }
}
