import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { LabelService } from "../../services/repository/label.service";

@Controller("repositories/:owner/:repo")
export class LabelsController {
  constructor(private readonly labelService: LabelService) {}

  @Get("labels")
  listLabels(@Param("owner") owner: string, @Param("repo") repo: string) { return this.labelService.listLabels(owner, repo); }

  @Post("labels")
  createLabel(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.labelService.createLabel(owner, repo, dto); }

  @Get("milestones")
  listMilestones(@Param("owner") owner: string, @Param("repo") repo: string) { return this.labelService.listMilestones(owner, repo); }

  @Post("milestones")
  createMilestone(@Param("owner") owner: string, @Param("repo") repo: string, @Body() dto: any) { return this.labelService.createMilestone(owner, repo, dto); }
}
