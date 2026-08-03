import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import * as crypto from "crypto";
import { AuditService } from "./audit.service";

@Injectable()
export class SshKeyService {
  constructor(private readonly auditService: AuditService) {}

  async list(userId: string) {
    return prisma.sshKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async add(userId: string, dto: any) {
    if (!dto.title || !dto.key) {
      throw new BadRequestException("Title and key are required");
    }

    // Parse key to extract fingerprint
    let fingerprint: string;
    try {
      const parts = dto.key.trim().split(/\s+/);
      if (parts.length < 2) {
        throw new BadRequestException("Invalid SSH key format");
      }
      const keyBuffer = Buffer.from(parts[1], "base64");
      fingerprint = crypto.createHash("sha256").update(keyBuffer).digest("base64").replace(/=$/, "");
    } catch (e) {
      throw new BadRequestException("Invalid SSH public key base64 data");
    }

    // Check fingerprint uniqueness
    const existingFingerprint = await prisma.sshKey.findUnique({
      where: { fingerprint },
    });
    if (existingFingerprint) {
      throw new BadRequestException("An SSH key with this fingerprint already exists");
    }

    // Check key uniqueness
    const existingKey = await prisma.sshKey.findUnique({
      where: { key: dto.key },
    });
    if (existingKey) {
      throw new BadRequestException("This SSH key is already registered");
    }

    const keyType = dto.keyType || "authentication";

    const sshKey = await prisma.sshKey.create({
      data: {
        userId,
        title: dto.title,
        key: dto.key,
        fingerprint,
        keyType,
      },
    });

    await this.auditService.log("ssh_key.add", userId, "SshKey", sshKey.id);

    return sshKey;
  }

  async remove(userId: string, id: string) {
    const sshKey = await prisma.sshKey.findUnique({
      where: { id },
    });

    if (!sshKey || sshKey.userId !== userId) {
      throw new NotFoundException("SSH key not found");
    }

    await prisma.sshKey.delete({
      where: { id },
    });

    await this.auditService.log("ssh_key.remove", userId, "SshKey", id);

    return { message: "key-removed" };
  }
}
