import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
  async findByUsername(username: string) { return { username }; }
  async getCurrentUser() { return null; }
  async updateUser(dto: any) { return { message: "updated" }; }
  async getFollowing() { return []; }
  async getStarred() { return []; }
}
