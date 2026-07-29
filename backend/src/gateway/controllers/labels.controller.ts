import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { LabelService } from "../../services/repository/label.service";

@Controller("repositories/:owner/:repo")
export class LabelsController {
  constructor(private readonly labelService: LabelService) {}

  @Get("labels")
  listLabels(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.labelService.listLabels(owner, repo);
  }

  @Post("labels")
  createLabel(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) {
    return this.labelService.createLabel(owner, repo, dto);
  }

  @Patch("labels/:name")
  updateLabel(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("name") name: string,
    @Body() dto: any
  ) {
    return this.labelService.updateLabel(owner, repo, name, dto);
  }

  @Delete("labels/:name")
  deleteLabel(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("name") name: string
  ) {
    return this.labelService.deleteLabel(owner, repo, name);
  }

  @Get("milestones")
  listMilestones(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.labelService.listMilestones(owner, repo);
  }

  @Post("milestones")
  createMilestone(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) {
    return this.labelService.createMilestone(owner, repo, dto);
  }

  @Patch("milestones/:id")
  updateMilestone(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    return this.labelService.updateMilestone(owner, repo, id, dto);
  }

  @Delete("milestones/:id")
  deleteMilestone(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string
  ) {
    return this.labelService.deleteMilestone(owner, repo, id);
  }
}
