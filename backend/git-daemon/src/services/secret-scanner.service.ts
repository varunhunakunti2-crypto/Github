import { Injectable } from '@nestjs/common';
import { prisma } from '@gitforge/database';
import { GitCommandRunner } from '../utils/git-command-runner';

interface SecretPattern {
  name: string;
  regex: RegExp;
  highConfidence: boolean;
  remediation: string;
}

@Injectable()
export class SecretScannerService {
  private readonly patterns: SecretPattern[] = [
    {
      name: "AWS Access Key ID",
      regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
      highConfidence: true,
      remediation: "Revoke the AWS Access Key immediately from the AWS Console and rotate it. Delete the commit from history using git-filter-repo."
    },
    {
      name: "Private Key (Header)",
      regex: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----/g,
      highConfidence: true,
      remediation: "Revoke this private key, generate a new key pair, and update all systems using the public key. Purge file history using BFG Repo-Cleaner."
    },
    {
      name: "GitHub Personal Access Token",
      regex: /(ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9_]{36,255}/g,
      highConfidence: true,
      remediation: "Revoke the GitHub PAT immediately in developer settings and rotate. Clean repository history before pushing."
    },
    {
      name: "Database Credentials URL",
      regex: /[a-zA-Z0-9]+:\/\/[a-zA-Z0-9-_.]+:[a-zA-Z0-9-_~%#+]+@[a-zA-Z0-9.-]+:[0-9]+\/[a-zA-Z0-9-_]+/g,
      highConfidence: false,
      remediation: "Rotate database password, update environment variables config on hosting provider, and purge connection strings from commits."
    },
    {
      name: "Generic Secret Key Pattern",
      regex: /(?:key|secret|password|passwd|token)\s*[:=]\s*["']([a-zA-Z0-9-_]{32,})["']/gi,
      highConfidence: false,
      remediation: "Rotate the leaked credential. Move configuration values to environment variables (.env files) or KMS secrets instead of hardcoding."
    }
  ];

  async scanDiff(
    repoPath: string,
    repositoryId: string,
    oldSha: string,
    newSha: string
  ): Promise<{ blocked: boolean; findings: any[]; message?: string }> {
    const findings: any[] = [];
    let blocked = false;
    let blockMessage = '';

    // If newSha is all zeros, branch is deleted. Nothing to scan.
    if (newSha === '0000000000000000000000000000000000000000') {
      return { blocked: false, findings: [] };
    }

    try {
      // Get diff of added lines.
      // If oldSha is all zeros (new branch), compare against empty tree SHA
      const baseSha = oldSha === '0000000000000000000000000000000000000000' 
        ? '4b825dc642cb6eb9a030e54bf8d69288fbee4904' 
        : oldSha;

      const { stdout } = await GitCommandRunner.execute([
        'diff',
        '-U0',
        baseSha.trim(),
        newSha.trim()
      ], { cwd: repoPath });

      let currentFile = '';
      let currentLineNum = 0;

      const lines = stdout.split('\n');
      for (const line of lines) {
        // Parse filename
        if (line.startsWith('diff --git a/')) {
          const match = /^diff --git a\/(.+?) b\/(.+?)$/.exec(line);
          if (match) {
            currentFile = match[2];
          }
          continue;
        }

        // Parse hunk header
        if (line.startsWith('@@')) {
          const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
          if (match) {
            currentLineNum = parseInt(match[1], 10);
          }
          continue;
        }

        // Parse added line
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const content = line.substring(1); // Strip the '+' prefix
          
          for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
              const matchedText = match[0];
              const masked = this.maskSecret(matchedText);

              findings.push({
                repositoryId,
                commitSha: newSha,
                filePath: currentFile,
                lineNumber: currentLineNum,
                secretType: pattern.name,
                matchedPatternMasked: masked,
                status: 'open',
              });

              if (pattern.highConfidence) {
                blocked = true;
                blockMessage += `\n[HIGH CONFIDENCE SECRET BLOCKED] Found ${pattern.name} in file: ${currentFile} on line: ${currentLineNum}\n-> ${masked}\nRemediation: ${pattern.remediation}\n`;
              }
            }
          }
          currentLineNum++;
        }
      }

      // Write findings to DB
      if (findings.length > 0) {
        for (const finding of findings) {
          await prisma.secretScanFinding.create({
            data: finding
          });
        }

        // Notify repo admins
        const ownerName = repoPath.replace(/\\/g, '/').split('/').slice(-2, -1)[0];
        const repoName = repoPath.replace(/\\/g, '/').split('/').slice(-1)[0].replace(/\.git$/, '');
        this.notifyAdmins(
          repositoryId,
          `Secrets Detected in ${ownerName}/${repoName}`,
          `We detected ${findings.length} potential secret(s) in commit ${newSha.substring(0, 7)}. Some pushes may have been blocked or flagged.`,
          `/${ownerName}/${repoName}/security/secrets`
        ).catch(err => console.error('[SECRET-SCANNER] Admin notification failed:', err));
      }

      return {
        blocked,
        findings,
        message: blocked ? blockMessage : undefined
      };

    } catch (e: any) {
      console.error('[SECRET-SCANNER] Error during diff scan:', e);
      return { blocked: false, findings: [] }; // Fail open for scan issues
    }
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
          senderId: adminId, // System self-notification
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

  private maskSecret(val: string): string {
    if (val.length <= 8) return '*'.repeat(val.length);
    if (val.startsWith('-----BEGIN')) {
      return '-----BEGIN...PRIVATE KEY-----';
    }
    return val.substring(0, 8) + '*'.repeat(val.length - 8);
  }
}
