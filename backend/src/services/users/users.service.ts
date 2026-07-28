import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class UsersService {
  async findByUsername(username: string) { return { username }; }
  async findByEmail(email: string) { 
    return await prisma.user.findUnique({ where: { email }, select: { username: true } }); 
  }
  async getCurrentUser() { return null; }
  async updateUser(dto: any) { return { message: "updated" }; }
  async getFollowing() { return []; }
  async getStarred() { return []; }
}
