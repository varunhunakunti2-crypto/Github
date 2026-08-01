import { Controller, Get, Post, Delete, Param, Body, Res, UseGuards, NotFoundException } from "@nestjs/common";
import { WorkflowService } from "../../services/actions/workflow.service";
import { JobService } from "../../services/actions/job.service";
import { ArtifactService } from "../../services/actions/artifact.service";
import { SecretService } from "../../services/actions/secret.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Response } from "express";

@Controller("repositories/:owner/:repo")
export class WorkflowsController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly jobService: JobService,
    private readonly artifactService: ArtifactService,
    private readonly secretService: SecretService
  ) {}

  // ── Workflows ────────────────────────────────────────────────────────

  @Get("workflows")
  listWorkflows(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.workflowService.list(owner, repo);
  }

  // ── Runs ─────────────────────────────────────────────────────────────

  @Get("workflows/runs")
  listRuns(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.workflowService.listRuns(owner, repo);
  }

  @Get("workflows/runs/:runId")
  getRun(@Param("owner") owner: string, @Param("repo") repo: string, @Param("runId") runId: string) {
    return this.workflowService.getRun(owner, repo, runId);
  }

  @Post("workflows/:workflowId/dispatch")
  @UseGuards(AuthGuard)
  manualDispatch(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("workflowId") workflowId: string,
    @CurrentUser() user: any
  ) {
    return this.workflowService.manualDispatch(owner, repo, workflowId, user?.id || "unknown");
  }

  @Post("workflows/runs/:runId/cancel")
  @UseGuards(AuthGuard)
  cancelRun(@Param("owner") owner: string, @Param("repo") repo: string, @Param("runId") runId: string) {
    return this.workflowService.cancelRun(owner, repo, runId);
  }

  @Post("workflows/runs/:runId/rerun")
  @UseGuards(AuthGuard)
  rerunWorkflow(@Param("owner") owner: string, @Param("repo") repo: string, @Param("runId") runId: string) {
    return this.workflowService.rerun(owner, repo, runId);
  }

  // ── Jobs & Logs ──────────────────────────────────────────────────────

  @Get("workflows/runs/:runId/jobs")
  listJobs(@Param("runId") runId: string) {
    return this.jobService.listJobs(runId);
  }

  @Get("workflows/jobs/:jobId/logs")
  getJobLogs(@Param("jobId") jobId: string) {
    return this.jobService.getJobLogs(jobId);
  }

  // ── Artifacts ────────────────────────────────────────────────────────

  @Get("workflows/runs/:runId/artifacts")
  listArtifacts(@Param("runId") runId: string) {
    return this.artifactService.listArtifacts(runId);
  }

  @Get("workflows/artifacts/:artifactId/download")
  async downloadArtifact(@Param("artifactId") artifactId: string, @Res() res: Response) {
    const { buffer, name } = await this.artifactService.downloadArtifact(artifactId);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.send(buffer);
  }

  // ── Secrets ──────────────────────────────────────────────────────────

  @Get("secrets")
  listSecrets(@Param("owner") owner: string, @Param("repo") repo: string) {
    return this.secretService.listSecrets(owner, repo);
  }

  @Post("secrets")
  @UseGuards(AuthGuard)
  createSecret(@Param("owner") owner: string, @Param("repo") repo: string, @Body() body: { name: string; value: string }) {
    return this.secretService.createSecret(owner, repo, body.name, body.value);
  }

  @Delete("secrets/:secretId")
  @UseGuards(AuthGuard)
  deleteSecret(@Param("owner") owner: string, @Param("repo") repo: string, @Param("secretId") secretId: string) {
    return this.secretService.deleteSecret(owner, repo, secretId);
  }
}
