import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { AuditService } from "../security/audit.service";

@Injectable()
export class BranchService {
  constructor(private readonly auditService: AuditService) {}

  async list(owner: string, repo: string) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches`);
    return await res.json();
  }
  
  async create(owner: string, repo: string, dto: any) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_bypass_token' },
      body: JSON.stringify(dto)
    });
    if (!res.ok) throw new Error('Failed to create branch');
    return await res.json();
  }
  
  async remove(owner: string, repo: string, branch: string) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches/${branch}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer mock_bypass_token' }
    });
    if (!res.ok) throw new Error('Failed to delete branch');
    return await res.json();
  }

  async listProtectionRules(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } }
        ]
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.branchProtectionRule.findMany({
      where: { repositoryId: repository.id }
    });
  }

  async createOrUpdateProtectionRule(owner: string, repo: string, userId: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } }
        ]
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const rule = await prisma.branchProtectionRule.upsert({
      where: {
        repositoryId_branchPattern: {
          repositoryId: repository.id,
          branchPattern: dto.branchPattern
        }
      },
      update: {
        requirePr: dto.requirePr ?? false,
        requiredApprovals: dto.requiredApprovals ?? 0,
        requireStatusChecks: dto.requireStatusChecks ?? false,
        requireSignedCommits: dto.requireSignedCommits ?? false,
        restrictPush: dto.restrictPush ?? false,
        allowedUserIds: dto.allowedUserIds || []
      },
      create: {
        repositoryId: repository.id,
        branchPattern: dto.branchPattern,
        requirePr: dto.requirePr ?? false,
        requiredApprovals: dto.requiredApprovals ?? 0,
        requireStatusChecks: dto.requireStatusChecks ?? false,
        requireSignedCommits: dto.requireSignedCommits ?? false,
        restrictPush: dto.restrictPush ?? false,
        allowedUserIds: dto.allowedUserIds || []
      }
    });

    await this.auditService.log("branch_protection.update", userId, "BranchProtectionRule", rule.id);

    return rule;
  }

  async deleteProtectionRule(owner: string, repo: string, userId: string, id: string) {
    const rule = await prisma.branchProtectionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');

    await prisma.branchProtectionRule.delete({ where: { id } });

    await this.auditService.log("branch_protection.delete", userId, "BranchProtectionRule", id);

    return { message: "Rule deleted" };
  }
}
