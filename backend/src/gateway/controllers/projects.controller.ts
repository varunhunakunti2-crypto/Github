import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ProjectService } from "../../services/repository/project.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller()
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  @Get("repositories/:owner/:repo/projects")
  list(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.projectService.listProjects(owner, repo);
  }

  @Post("repositories/:owner/:repo/projects")
  @UseGuards(AuthGuard)
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) {
    return this.projectService.createProject(owner, repo, dto);
  }

  @Get("projects/:id")
  getBoard(@Param("id") id: string) {
    return this.projectService.getBoard(id);
  }

  @Post("projects/:id/items")
  @UseGuards(AuthGuard)
  addItem(@Param("id") id: string, @Body() dto: any) {
    return this.projectService.addItem(id, dto);
  }

  @Patch("projects/:projectId/items/:itemId")
  @UseGuards(AuthGuard)
  updateItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @Body() dto: any
  ) {
    return this.projectService.updateItem(projectId, itemId, dto);
  }

  @Delete("projects/:projectId/items/:itemId")
  @UseGuards(AuthGuard)
  deleteItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string
  ) {
    return this.projectService.deleteItem(projectId, itemId);
  }

  // Saved Views Management
  @Get("projects/:id/views")
  listViews(@Param("id") id: string) {
    return this.projectService.listViews(id);
  }

  @Post("projects/:id/views")
  @UseGuards(AuthGuard)
  createView(@Param("id") id: string, @Body() dto: any) {
    return this.projectService.createView(id, dto);
  }

  @Patch("projects/:projectId/views/:viewId")
  @UseGuards(AuthGuard)
  updateView(@Param("viewId") viewId: string, @Body() dto: any) {
    return this.projectService.updateView(viewId, dto);
  }

  @Delete("projects/:projectId/views/:viewId")
  @UseGuards(AuthGuard)
  deleteView(@Param("viewId") viewId: string) {
    return this.projectService.deleteView(viewId);
  }

  // Convert standalone task (note) to real Issue
  @Post("projects/:projectId/items/:itemId/convert-issue")
  @UseGuards(AuthGuard)
  convertTaskToIssue(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() user: User
  ) {
    return this.projectService.convertTaskToIssue(projectId, itemId, user.id);
  }
}
