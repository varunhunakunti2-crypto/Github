import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_RAW = process.env.SECRETS_ENCRYPTION_KEY || "gitforge-secrets-key-32bytes!!!";
// Derive exactly 32 bytes key buffer
const ENCRYPTION_KEY = crypto.scryptSync(ENCRYPTION_KEY_RAW, "salt", 32);


@Injectable()
export class SecretService {
  /**
   * List secret NAMES only — never return values, not even to admins.
   */
  async listSecrets(owner: string, repo: string) {
    const repository = await this.findRepo(owner, repo);
    return prisma.repoSecret.findMany({
      where: { repositoryId: repository.id },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
  }

  /**
   * Create or update a secret. Write-only: you can set a value but never read it back.
   */
  async createSecret(owner: string, repo: string, name: string, plainValue: string) {
    const repository = await this.findRepo(owner, repo);

    // Encrypt the value with AES-256-GCM
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plainValue, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return prisma.repoSecret.upsert({
      where: { repositoryId_name: { repositoryId: repository.id, name } },
      update: {
        encryptedValue: encrypted,
        iv: iv.toString("hex"),
        authTag
      },
      create: {
        name,
        encryptedValue: encrypted,
        iv: iv.toString("hex"),
        authTag,
        repositoryId: repository.id
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true }
    });
  }

  /**
   * Delete a secret.
   */
  async deleteSecret(owner: string, repo: string, secretId: string) {
    const secret = await prisma.repoSecret.findUnique({ where: { id: secretId } });
    if (!secret) throw new NotFoundException("Secret not found");
    await prisma.repoSecret.delete({ where: { id: secretId } });
    return { message: "Secret deleted" };
  }

  /**
   * INTERNAL ONLY — decrypt all secret values for a repository.
   * Used by JobService to inject into container env and for log scrubbing.
   * These values are NEVER returned via API.
   */
  async getDecryptedValues(repositoryId: string): Promise<string[]> {
    const secrets = await prisma.repoSecret.findMany({ where: { repositoryId } });
    return secrets.map(s => {
      try {
        const decipher = crypto.createDecipheriv(
          ALGORITHM,
          ENCRYPTION_KEY,
          Buffer.from(s.iv, "hex")
        );
        decipher.setAuthTag(Buffer.from(s.authTag, "hex"));
        let decrypted = decipher.update(s.encryptedValue, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } catch {
        return ""; // If decryption fails, return empty (won't match anything in scrubbing)
      }
    });
  }

  /**
   * INTERNAL ONLY — get decrypted secrets as key-value pairs for container injection.
   */
  async getDecryptedMap(repositoryId: string): Promise<Record<string, string>> {
    const secrets = await prisma.repoSecret.findMany({ where: { repositoryId } });
    const result: Record<string, string> = {};
    for (const s of secrets) {
      try {
        const decipher = crypto.createDecipheriv(
          ALGORITHM,
          ENCRYPTION_KEY,
          Buffer.from(s.iv, "hex")
        );
        decipher.setAuthTag(Buffer.from(s.authTag, "hex"));
        let decrypted = decipher.update(s.encryptedValue, "hex", "utf8");
        decrypted += decipher.final("utf8");
        result[s.name] = decrypted;
      } catch {
        // Skip failed decryptions
      }
    }
    return result;
  }

  private async findRepo(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) throw new NotFoundException("Repository not found");
    return repository;
  }
}
