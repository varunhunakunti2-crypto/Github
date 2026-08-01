import { Controller, Get, Put, Param, Body, UseGuards } from "@nestjs/common";
import { UsersService } from "../../services/users/users.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("users/:username")
  getUser(@Param("username") username: string) { return this.usersService.findByUsername(username); }

  @Get("users/lookup/:email")
  async getUserByEmail(@Param("email") email: string) {
    const user = await this.usersService.findByEmail(email);
    return user || { username: null };
  }

  @Get("user")
  @UseGuards(AuthGuard)
  getCurrentUser(@CurrentUser() user: User) { return this.usersService.getCurrentUser(user.id); }

  @Put("user")
  @UseGuards(AuthGuard)
  updateCurrentUser(@CurrentUser() user: User, @Body() dto: any) { return this.usersService.updateUser(user.id, dto); }

  @Get("user/following")
  getFollowing() { return this.usersService.getFollowing(); }

  @Get("user/starred")
  getStarred() { return this.usersService.getStarred(); }
}
