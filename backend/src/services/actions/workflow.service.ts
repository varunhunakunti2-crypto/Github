import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { WorkflowParserService, ParsedWorkflow, ParsedJob } from "./workflow-parser.service";
import { JobService } from "./job.service";

@Injectable()
export class WorkflowService {
  constructor(
    private readonly parser: WorkflowParserService,
    private readonly jobService: JobService
  ) {}

  /**
   * List all workflows for a repository (parsed from .github/workflows/ files).
   */
  async list(owner: string, repo: string) {
    const repository = await this.findRepo(owner, repo);
    return prisma.workflow.findMany({
      where: { repositoryId: repository.id },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * List all workflow runs for a repository, with nested job statuses.
   */
  async listRuns(owner: string, repo: string) {
    const repository = await this.findRepo(owner, repo);
    const workflows = await prisma.workflow.findMany({
      where: { repositoryId: repository.id },
      select: { id: true }
    });
    return prisma.workflowRun.findMany({
      where: { workflowId: { in: workflows.map(w => w.id) } },
      include: {
        workflow: { select: { name: true, filePath: true } },
        jobs: { select: { id: true, name: true, status: true } },
        _count: { select: { artifacts: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  /**
   * Get a single workflow run with full job/step details and artifacts.
   */
  async getRun(owner: string, repo: string, runId: string) {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: true,
        jobs: {
          include: { steps: { orderBy: { order: "asc" } } },
          orderBy: { createdAt: "asc" }
        },
        artifacts: true
      }
    });
    if (!run) throw new NotFoundException("Workflow run not found");
    return run;
  }

  /**
   * Trigger workflows matching an event (called from git hooks on push/PR).
   */
  async triggerFromEvent(owner: string, repo: string, event: string, context: { branch?: string; sha?: string; paths?: string[]; userId?: string }) {
    const repository = await this.findRepo(owner, repo);
    const workflows = await prisma.workflow.findMany({ where: { repositoryId: repository.id } });

    const triggeredRuns = [];
    for (const wf of workflows) {
      const triggers = JSON.parse(wf.triggers);
      if (this.parser.matchesTrigger(triggers, event, context)) {
        const run = await this.createRun(wf.id, event, context);
        triggeredRuns.push(run);
      }
    }

    return triggeredRuns;
  }

  /**
   * Manual dispatch (workflow_dispatch trigger).
   */
  async manualDispatch(owner: string, repo: string, workflowId: string, userId: string) {
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf) throw new NotFoundException("Workflow not found");

    const triggers = JSON.parse(wf.triggers);
    if (!triggers.workflow_dispatch) {
      throw new ConflictException("This workflow does not support manual dispatch (no workflow_dispatch trigger)");
    }

    return this.createRun(wf.id, "workflow_dispatch", { branch: "main", sha: "HEAD", userId });
  }

  /**
   * Cancel a running workflow run.
   */
  async cancelRun(owner: string, repo: string, runId: string) {
    const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException("Workflow run not found");
    if (run.status !== "queued" && run.status !== "in_progress") {
      throw new ConflictException("Can only cancel queued or in-progress runs");
    }

    // Cancel all pending/running jobs
    await prisma.workflowJob.updateMany({
      where: { runId, status: { in: ["queued", "in_progress"] } },
      data: { status: "cancelled", completedAt: new Date() }
    });

    return prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "cancelled", completedAt: new Date() }
    });
  }

  /**
   * Re-run a completed workflow run.
   */
  async rerun(owner: string, repo: string, runId: string) {
    const original = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: true }
    });
    if (!original) throw new NotFoundException("Workflow run not found");

    return this.createRun(original.workflowId, original.triggerEvent, {
      branch: original.headBranch,
      sha: original.headSha,
      userId: original.triggeredBy || undefined
    });
  }

  /**
   * Register or update a workflow definition from a parsed YAML file.
   */
  async upsertWorkflow(repositoryId: string, parsed: ParsedWorkflow) {
    return prisma.workflow.upsert({
      where: { repositoryId_filePath: { repositoryId, filePath: parsed.filePath } },
      update: {
        name: parsed.name,
        triggers: JSON.stringify(parsed.triggers)
      },
      create: {
        name: parsed.name,
        filePath: parsed.filePath,
        triggers: JSON.stringify(parsed.triggers),
        repositoryId
      }
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async createRun(workflowId: string, event: string, context: { branch?: string; sha?: string; userId?: string }) {
    // Count existing runs for run number
    const count = await prisma.workflowRun.count({ where: { workflowId } });

    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        runNumber: count + 1,
        status: "queued",
        triggerEvent: event,
        headSha: context.sha || "HEAD",
        headBranch: context.branch || "main",
        triggeredBy: context.userId
      }
    });

    // Load workflow to get job definitions
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf) return run;

    // We need the parsed jobs — re-parse triggers to get the full config.
    // In a real system the full job config would be stored; here we seed
    // the jobs from the database if they were previously parsed, or use
    // a default single-job structure.
    await this.expandAndEnqueueJobs(run.id, wf);

    return run;
  }

  private async expandAndEnqueueJobs(runId: string, wf: any) {
    // For now, parse the workflow triggers to get job names.
    // In a full implementation, the complete job definitions would be stored
    // alongside the workflow. Here we create a sensible default.
    const triggersConfig = JSON.parse(wf.triggers);

    // Create a default "build" job with checkout + run steps
    const job = await prisma.workflowJob.create({
      data: {
        runId,
        name: "build",
        status: "queued",
        runsOn: "ubuntu-latest"
      }
    });

    // Create default steps
    await prisma.workflowStep.createMany({
      data: [
        { jobId: job.id, name: "Checkout", command: "git checkout $HEAD_SHA", order: 0 },
        { jobId: job.id, name: "Install dependencies", command: "npm ci", order: 1 },
        { jobId: job.id, name: "Run tests", command: "npm test", order: 2 }
      ]
    });

    // Immediately start execution via the job service
    this.jobService.executeJob(job.id).catch(err =>
      console.error(`[RUNNER] Job ${job.id} execution failed:`, err)
    );
  }

  private async findRepo(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) throw new NotFoundException("Repository not found");
    return repository;
  }
}
