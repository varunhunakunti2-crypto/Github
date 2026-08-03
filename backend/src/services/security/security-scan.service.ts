import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { AuditService } from "./audit.service";

@Injectable()
export class SecurityScanService {
  constructor(private readonly auditService: AuditService) {}

  private async getRepository(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } }
        ]
      }
    });
    if (!repository) throw new NotFoundException("Repository not found");
    return repository;
  }

  async listSecrets(owner: string, repo: string) {
    const repository = await this.getRepository(owner, repo);
    return prisma.secretScanFinding.findMany({
      where: { repositoryId: repository.id },
      orderBy: { detectedAt: "desc" }
    });
  }

  async resolveSecret(owner: string, repo: string, userId: string, findingId: string, status: string) {
    const repository = await this.getRepository(owner, repo);
    const finding = await prisma.secretScanFinding.findFirst({
      where: { id: findingId, repositoryId: repository.id }
    });
    if (!finding) throw new NotFoundException("Finding not found");

    const updated = await prisma.secretScanFinding.update({
      where: { id: findingId },
      data: {
        status,
        resolvedById: userId,
        resolvedAt: new Date()
      }
    });

    await this.auditService.log(`secret_finding.resolve.${status}`, userId, "SecretScanFinding", findingId);

    return updated;
  }

  async listDependencies(owner: string, repo: string) {
    const repository = await this.getRepository(owner, repo);
    return prisma.dependencyAlert.findMany({
      where: { repositoryId: repository.id },
      orderBy: { detectedAt: "desc" }
    });
  }

  async dismissDependency(owner: string, repo: string, userId: string, alertId: string, status: string, reason?: string) {
    const repository = await this.getRepository(owner, repo);
    const alert = await prisma.dependencyAlert.findFirst({
      where: { id: alertId, repositoryId: repository.id }
    });
    if (!alert) throw new NotFoundException("Alert not found");

    // Status can be: 'dismissed' (with reason) or 'fixed'
    const updated = await prisma.dependencyAlert.update({
      where: { id: alertId },
      data: {
        status: status as any
      }
    });

    await this.auditService.log(`dependency_alert.dismiss.${status}`, userId, "DependencyAlert", alertId);

    return updated;
  }

  async getOverview(owner: string, repo: string) {
    const repository = await this.getRepository(owner, repo);

    const [secrets, dependencies, protectionRules] = await Promise.all([
      prisma.secretScanFinding.findMany({
        where: { repositoryId: repository.id }
      }),
      prisma.dependencyAlert.findMany({
        where: { repositoryId: repository.id }
      }),
      prisma.branchProtectionRule.findMany({
        where: { repositoryId: repository.id }
      })
    ]);

    const openSecrets = secrets.filter(s => s.status === 'open');
    const openDependencies = dependencies.filter(d => d.status === 'open');

    return {
      repositoryId: repository.id,
      name: repository.name,
      openSecretCount: openSecrets.length,
      openDependencyCount: openDependencies.length,
      protectedBranchesCount: protectionRules.length,
      secrets: openSecrets,
      dependencies: openDependencies,
      protectionRules
    };
  }
}
