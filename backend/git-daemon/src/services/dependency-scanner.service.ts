import { Injectable } from '@nestjs/common';
import { prisma } from '@gitforge/database';
import { GitCommandRunner } from '../utils/git-command-runner';

interface VulnerabilityDbEntry {
  packageName: string;
  ecosystem: string;
  vulnerableRange: string;
  patchedVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cveId: string;
  maxVulnerableVersion: string; // Helper for simple version comparison
}

@Injectable()
export class DependencyScannerService {
  // Manually curated test database of vulnerabilities
  private readonly vulnerabilityDb: VulnerabilityDbEntry[] = [
    {
      packageName: 'lodash',
      ecosystem: 'npm',
      vulnerableRange: '<4.17.21',
      patchedVersion: '4.17.21',
      severity: 'critical',
      cveId: 'CVE-2020-8203',
      maxVulnerableVersion: '4.17.20'
    },
    {
      packageName: 'express',
      ecosystem: 'npm',
      vulnerableRange: '<4.20.0',
      patchedVersion: '4.20.0',
      severity: 'medium',
      cveId: 'CVE-2024-43796',
      maxVulnerableVersion: '4.19.9'
    },
    {
      packageName: 'requests',
      ecosystem: 'pypi',
      vulnerableRange: '<2.31.0',
      patchedVersion: '2.31.0',
      severity: 'high',
      cveId: 'CVE-2023-32681',
      maxVulnerableVersion: '2.30.9'
    },
    {
      packageName: 'django',
      ecosystem: 'pypi',
      vulnerableRange: '<4.2.11',
      patchedVersion: '4.2.11',
      severity: 'high',
      cveId: 'CVE-2024-27351',
      maxVulnerableVersion: '4.2.10'
    }
  ];

  async scanRepo(repoPath: string, repositoryId: string, ref: string): Promise<any[]> {
    const alerts: any[] = [];

    // Ecosystem 1: NPM (package.json)
    try {
      const { stdout: packageJsonStr } = await GitCommandRunner.execute([
        'show',
        `${ref}:package.json`
      ], { cwd: repoPath });

      if (packageJsonStr) {
        const parsed = JSON.parse(packageJsonStr);
        const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
        
        for (const [pkg, versionSpec] of Object.entries(deps)) {
          const cleanVersion = (versionSpec as string).replace(/[^0-9.]/g, '');
          if (!cleanVersion) continue;

          const match = this.vulnerabilityDb.find(v => v.packageName === pkg && v.ecosystem === 'npm');
          if (match && this.isOlderThan(cleanVersion, match.patchedVersion)) {
            alerts.push({
              repositoryId,
              packageName: pkg,
              packageEcosystem: 'npm',
              vulnerableVersionRange: match.vulnerableRange,
              patchedVersion: match.patchedVersion,
              severity: match.severity,
              cveId: match.cveId,
              status: 'open',
              manifestFilePath: 'package.json'
            });
          }
        }
      }
    } catch (e) {
      // Ignored if package.json doesn't exist at this ref
    }

    // Ecosystem 2: PyPI (requirements.txt)
    try {
      const { stdout: reqsStr } = await GitCommandRunner.execute([
        'show',
        `${ref}:requirements.txt`
      ], { cwd: repoPath });

      if (reqsStr) {
        const lines = reqsStr.split('\n');
        for (const line of lines) {
          const cleanLine = line.trim().split('#')[0]; // Strip comments
          if (!cleanLine) continue;

          // Match packages with strict versions, e.g., requests==2.28.0
          const matchParts = /^([a-zA-Z0-9-_]+)\s*==\s*([0-9.]+)/.exec(cleanLine);
          if (matchParts) {
            const pkg = matchParts[1].toLowerCase();
            const version = matchParts[2];

            const match = this.vulnerabilityDb.find(v => v.packageName.toLowerCase() === pkg && v.ecosystem === 'pypi');
            if (match && this.isOlderThan(version, match.patchedVersion)) {
              alerts.push({
                repositoryId,
                packageName: match.packageName,
                packageEcosystem: 'pypi',
                vulnerableVersionRange: match.vulnerableRange,
                patchedVersion: match.patchedVersion,
                severity: match.severity,
                cveId: match.cveId,
                status: 'open',
                manifestFilePath: 'requirements.txt'
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignored if requirements.txt doesn't exist
    }

    // Save alerts to DB (auto-de-duplicate)
    if (alerts.length > 0) {
      for (const alert of alerts) {
        const existing = await prisma.dependencyAlert.findFirst({
          where: {
            repositoryId: alert.repositoryId,
            packageName: alert.packageName,
            cveId: alert.cveId,
            status: 'open'
          }
        });

        if (!existing) {
          await prisma.dependencyAlert.create({
            data: alert
          });

          // Notify repo admins
          const ownerName = repoPath.replace(/\\/g, '/').split('/').slice(-2, -1)[0];
          const repoName = repoPath.replace(/\\/g, '/').split('/').slice(-1)[0].replace(/\.git$/, '');
          const isUrgent = alert.severity === 'critical' || alert.severity === 'high';
          const title = isUrgent
            ? `[CRITICAL SECURITY ALERT] Vulnerable dependency in ${ownerName}/${repoName}`
            : `[Security Alert] Vulnerable dependency in ${ownerName}/${repoName}`;
          
          this.notifyAdmins(
            repositoryId,
            title,
            `We detected a ${alert.severity} severity vulnerability in package "${alert.packageName}" (CVE ID: ${alert.cveId || 'N/A'}) in ${alert.manifestFilePath}.`,
            `/${ownerName}/${repoName}/security/dependencies`
          ).catch(err => console.error('[DEPENDENCY-SCANNER] Admin notification failed:', err));
        }
      }
    }

    return alerts;
  }

  private async notifyAdmins(repositoryId: string, title: string, body: string, url: string) {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        owner: true,
        organization: {
          include: {
            members: {
              where: { role: 'OWNER' }
            }
          }
        }
      }
    });
    if (!repository) return;

    const adminIds = new Set<string>();
    if (repository.ownerId) {
      adminIds.add(repository.ownerId);
    }
    if (repository.organization && repository.organization.members) {
      for (const member of repository.organization.members) {
        adminIds.add(member.userId);
      }
    }

    for (const adminId of adminIds) {
      await prisma.notification.create({
        data: {
          recipientId: adminId,
          senderId: adminId,
          repositoryId: repositoryId,
          notifiableType: 'Organization',
          notifiableId: repositoryId,
          reason: 'SUBSCRIBED',
          title,
          body,
          url,
          isRead: false
        }
      }).catch(err => console.error("Failed to write admin notification:", err));
    }
  }

  // Simple SemVer comparison helper
  private isOlderThan(v1: string, v2: string): boolean {
    const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false; // Equal
  }
}
