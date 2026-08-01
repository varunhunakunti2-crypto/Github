import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class UsersService {
  async findByUsername(username: string) { return { username }; }
  async findByEmail(email: string) { 
    return await prisma.user.findUnique({ where: { email }, select: { username: true } }); 
  }
  async getCurrentUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, avatarUrl: true, notificationPreference: true }
    });
  }
  async updateUser(userId: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.notificationPreference !== undefined) data.notificationPreference = dto.notificationPreference;

    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, name: true, avatarUrl: true, notificationPreference: true }
    });
  }
  async getFollowing() { return []; }
  async getStarred() { return []; }
}
