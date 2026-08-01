import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { SecretService } from "./secret.service";

@Injectable()
export class JobService {
  constructor(private readonly secretService: SecretService) {}

  async listJobs(runId: string) {
    return prisma.workflowJob.findMany({
      where: { runId },
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" }
    });
  }

  async getJobLogs(jobId: string) {
    const steps = await prisma.workflowStep.findMany({
      where: { jobId },
      orderBy: { order: "asc" }
    });
    return steps.map(s => ({
      step: s.name,
      status: s.status,
      log: s.logOutput || ""
    }));
  }

  /**
   * Execute a job in the simulated runner environment.
   *
   * ARCHITECTURE NOTE: In production, this would:
   * 1. Spin up an ephemeral Docker container (--memory=512m --cpus=1)
   * 2. Clone the repo at the commit SHA inside the container
   * 3. Inject secrets as environment variables
   * 4. Execute each step sequentially inside the container
   * 5. Stream stdout/stderr back via WebSocket
   * 6. Tear down the container after completion
   *
   * For dev/test without Docker, we simulate execution: record each step's
   * command, produce synthetic log output, transition statuses correctly.
   * The entire pipeline (parsing → queueing → status transitions → log
   * persistence → secret scrubbing) is exercised identically.
   */
  async executeJob(jobId: string) {
    // Transition job to in_progress
    const job = await prisma.workflowJob.update({
      where: { id: jobId },
      data: { status: "in_progress", startedAt: new Date(), runnerName: "simulated-runner-01" }
    });

    // Transition run to in_progress if it's still queued
    await prisma.workflowRun.updateMany({
      where: { id: job.runId, status: "queued" },
      data: { status: "in_progress", startedAt: new Date() }
    });

    const steps = await prisma.workflowStep.findMany({
      where: { jobId },
      orderBy: { order: "asc" }
    });

    // Load secrets for this job's repository (for log scrubbing)
    const run = await prisma.workflowRun.findUnique({
      where: { id: job.runId },
      include: { workflow: { include: { repository: true } } }
    });
    const secretValues = run
      ? await this.secretService.getDecryptedValues(run.workflow.repositoryId)
      : [];

    let jobFailed = false;

    for (const step of steps) {
      if (jobFailed) {
        // Skip remaining steps after a failure
        await prisma.workflowStep.update({
          where: { id: step.id },
          data: { status: "skipped" }
        });
        continue;
      }

      // Transition step to running
      await prisma.workflowStep.update({
        where: { id: step.id },
        data: { status: "running", startedAt: new Date() }
      });

      // Simulate execution — produce synthetic log output
      const rawLog = this.simulateStepExecution(step.name, step.command);

      // Scrub secrets from log output before persisting
      const scrubbedLog = this.scrubSecrets(rawLog, secretValues);

      // Determine success/failure (simulate: steps with "fail" in the command fail)
      const succeeded = !(step.command && step.command.toLowerCase().includes("fail"));

      await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: succeeded ? "success" : "failure",
          logOutput: scrubbedLog,
          completedAt: new Date()
        }
      });

      if (!succeeded) {
        jobFailed = true;
      }
    }

    // Finalize job status
    const finalStatus = jobFailed ? "failure" : "success";
    await prisma.workflowJob.update({
      where: { id: jobId },
      data: { status: finalStatus, completedAt: new Date() }
    });

    // Check if all jobs in the run are complete, finalize run status
    await this.finalizeRunStatus(job.runId);
  }

  private async finalizeRunStatus(runId: string) {
    const jobs = await prisma.workflowJob.findMany({ where: { runId } });
    const allDone = jobs.every(j => ["success", "failure", "cancelled"].includes(j.status));

    if (allDone) {
      const anyFailed = jobs.some(j => j.status === "failure");
      const anyCancelled = jobs.some(j => j.status === "cancelled");

      let runStatus = "success";
      if (anyFailed) runStatus = "failure";
      if (anyCancelled && !anyFailed) runStatus = "cancelled";

      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: runStatus, completedAt: new Date() }
      });
    }
  }

  private simulateStepExecution(stepName: string, command: string | null): string {
    const timestamp = new Date().toISOString();
    let log = `[${timestamp}] ▶ Running step: ${stepName}\n`;

    if (command) {
      log += `$ ${command}\n`;
      log += `[simulated] Executing command in isolated container...\n`;
      log += `[simulated] Command completed successfully.\n`;
    } else {
      log += `[simulated] Step has no command (uses action reference).\n`;
    }

    log += `[${timestamp}] ✓ Step ${stepName} finished.\n`;
    return log;
  }

  /**
   * Replace any occurrence of a secret value in log output with "***".
   * This is critical: a workflow step might echo $SECRET_VALUE, and we
   * must never persist or stream the actual secret.
   */
  private scrubSecrets(log: string, secretValues: string[]): string {
    let scrubbed = log;
    for (const secret of secretValues) {
      if (secret && secret.length > 0) {
        // Use global replacement — secrets could appear multiple times
        scrubbed = scrubbed.split(secret).join("***");
      }
    }
    return scrubbed;
  }
}
