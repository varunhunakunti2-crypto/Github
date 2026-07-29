import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { ProjectService } from "../../services/repository/project.service";

@Controller()
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  @Get("repositories/:owner/:repo/projects")
  list(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.projectService.listProjects(owner, repo);
  }

  @Post("repositories/:owner/:repo/projects")
  create(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) {
    return this.projectService.createProject(owner, repo, dto);
  }

  @Get("projects/:id")
  getBoard(@Param("id") id: string) {
    return this.projectService.getBoard(id);
  }

  @Post("projects/:id/items")
  addItem(@Param("id") id: string, @Body() dto: any) {
    return this.projectService.addItem(id, dto);
  }

  @Patch("projects/:projectId/items/:itemId")
  updateItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @Body() dto: any
  ) {
    return this.projectService.updateItem(projectId, itemId, dto);
  }

  @Delete("projects/:projectId/items/:itemId")
  deleteItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string
  ) {
    return this.projectService.deleteItem(projectId, itemId);
  }
}
