import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { UsersService } from "../../services/users/users.service";

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
  getCurrentUser() { return this.usersService.getCurrentUser(); }

  @Put("user")
  updateCurrentUser(@Body() dto: any) { return this.usersService.updateUser(dto); }

  @Get("user/following")
  getFollowing() { return this.usersService.getFollowing(); }

  @Get("user/starred")
  getStarred() { return this.usersService.getStarred(); }
}
