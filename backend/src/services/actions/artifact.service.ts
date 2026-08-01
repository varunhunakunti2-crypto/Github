import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ArtifactService {
  constructor(private readonly storageService: StorageService) {}

  /**
   * List artifacts for a workflow run.
   */
  async listArtifacts(runId: string) {
    return prisma.workflowArtifact.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Upload an artifact from a workflow step.
   */
  async uploadArtifact(runId: string, name: string, data: Buffer, expiresInDays: number = 90) {
    const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException("Workflow run not found");

    const storageKey = `artifacts/${runId}/${name}`;
    await this.storageService.uploadFile("actions", storageKey, data);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return prisma.workflowArtifact.create({
      data: {
        runId,
        name,
        fileUrl: storageKey,
        sizeBytes: data.length,
        expiresAt
      }
    });
  }

  /**
   * Download an artifact (streamed from storage).
   */
  async downloadArtifact(artifactId: string): Promise<{ buffer: Buffer; name: string }> {
    const artifact = await prisma.workflowArtifact.findUnique({ where: { id: artifactId } });
    if (!artifact) throw new NotFoundException("Artifact not found");

    const buffer = await this.storageService.downloadFile("actions", artifact.fileUrl);
    if (!buffer) throw new NotFoundException("Artifact file not found in storage");

    return { buffer, name: artifact.name };
  }

  /**
   * Cleanup expired artifacts — deletes from both storage and database.
   * Should be called on a schedule (e.g. daily cron).
   */
  async cleanupExpired() {
    const expired = await prisma.workflowArtifact.findMany({
      where: { expiresAt: { lt: new Date() } }
    });

    let cleaned = 0;
    for (const artifact of expired) {
      await this.storageService.deleteFile("actions", artifact.fileUrl);
      await prisma.workflowArtifact.delete({ where: { id: artifact.id } });
      cleaned++;
    }

    return { cleaned };
  }
}
