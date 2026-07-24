import { Controller, Get, Post, Param } from "@nestjs/common";
import { WorkflowService } from "../../services/actions/workflow.service";

@Controller("repositories/:owner/:repo")
export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get("workflows")
  listWorkflows(@Param("owner") owner: string, @Param("repo") repo: string) { return this.workflowService.list(owner, repo); }

  @Get("workflows/runs")
  listRuns(@Param("owner") owner: string, @Param("repo") repo: string) { return this.workflowService.listRuns(owner, repo); }

  @Get("workflows/runs/:runId")
  getRun(@Param("owner") owner: string, @Param("repo") repo: string, @Param("runId") runId: string) { return this.workflowService.getRun(owner, repo, runId); }

  @Post("workflows/runs/:runId/rerun")
  rerunWorkflow(@Param("owner") owner: string, @Param("repo") repo: string, @Param("runId") runId: string) { return this.workflowService.rerun(owner, repo, runId); }
}
