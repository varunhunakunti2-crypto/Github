import { Injectable } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { CacheService } from "../security/cache.service";

@Injectable()
export class RepositoryService {
  constructor(private readonly cache: CacheService) {}

  async create(dto: any) {
    const repo = await prisma.repository.create({
      data: {
        name: dto.name,
        description: dto.description || "",
        isPrivate: dto.isPrivate ?? false,
        ownerId: dto.ownerId,
        organizationId: dto.organizationId,
        isArchived: false
      }
    });
    return repo;
  }

  async findOne(owner: string, repo: string) {
    const cacheKey = `repo:meta:${owner}:${repo}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        OR: [
          { owner: { username: owner } },
          { organization: { slug: owner } }
        ]
      },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        organization: { select: { id: true, slug: true, name: true } }
      }
    });

    if (repository) {
      await this.cache.set(cacheKey, repository, 300); // cache for 5 mins
    }
    return repository;
  }

  async update(owner: string, repo: string, dto: any) {
    const repository = await this.findOne(owner, repo);
    if (!repository) return { message: "not-found" };

    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data: {
        description: dto.description,
        isPrivate: dto.isPrivate,
        isArchived: dto.isArchived
      }
    });

    // Invalidate caches
    await this.cache.del(`repo:meta:${owner}:${repo}`);
    await this.cache.invalidateRepoCache(owner, repo);

    return updated;
  }

  async remove(owner: string, repo: string) {
    const repository = await this.findOne(owner, repo);
    if (!repository) return { message: "not-found" };

    await prisma.repository.delete({
      where: { id: repository.id }
    });

    // Invalidate caches
    await this.cache.del(`repo:meta:${owner}:${repo}`);
    await this.cache.invalidateRepoCache(owner, repo);

    return { message: "deleted" };
  }

  async fork(owner: string, repo: string) { return { message: "forked" }; }
  async star(owner: string, repo: string) { return { message: "starred" }; }
  
  async getCollaborators(owner: string, repo: string) {
    const repository = await this.findOne(owner, repo);
    if (!repository) return [];
    
    // Return all users that have direct access to this repository
    const perms = await prisma.permission.findMany({
      where: { repositoryId: repository.id, granteeType: "USER" }
    });
    const userIds = perms.map(p => p.granteeId);
    
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, avatarUrl: true }
    });
  }

  async getContents(owner: string, repo: string, filePath: string, ref: string = "HEAD") {
    const cacheKey = `repo:readme:${owner}:${repo}:${ref}:${filePath}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const axios = require("axios");
    const gitDaemonUrl = process.env.GIT_DAEMON_URL || "http://localhost:3002";
    try {
      const res = await axios.get(`${gitDaemonUrl}/api/v1/repos/${owner}/${repo}/raw/${ref}/${filePath}`, {
        responseType: "text"
      });
      const fileContent = res.data;
      
      const payload = {
        name: filePath.split("/").pop(),
        path: filePath,
        content: Buffer.from(fileContent).toString("base64"),
        encoding: "base64"
      };

      if (filePath.toLowerCase() === "readme.md") {
        await this.cache.set(cacheKey, payload, 300); // Cache for 5 minutes
      }

      return payload;
    } catch (err: any) {
      if (err.response?.status === 404) {
        throw new Error("File not found");
      }
      throw new Error(`Failed to fetch file contents: ${err.message}`);
    }
  }
}


