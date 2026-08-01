import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

export interface ParsedQuery {
  textQuery: string;
  language?: string;
  starsOp?: ">" | "<" | "=";
  starsVal?: number;
  isOpen?: boolean;
  orgSlug?: string;
  userSlug?: string;
  repoName?: string;
}

@Injectable()
export class SearchService {
  
  // Parses GitHub-like search qualifiers from raw query string
  parseQuery(q: string): ParsedQuery {
    const result: ParsedQuery = { textQuery: q };
    if (!q) return result;

    const qualifiersRegex = /\b(language|lang|stars|is|org|user|repo):([^\s]+)/gi;
    let text = q;
    let match;

    while ((match = qualifiersRegex.exec(q)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2];
      text = text.replace(match[0], "");

      if (key === "language" || key === "lang") {
        result.language = value;
      } else if (key === "stars") {
        const starsMatch = /^([><]?)(.+)$/.exec(value);
        if (starsMatch) {
          result.starsOp = (starsMatch[1] as any) || "=";
          result.starsVal = parseInt(starsMatch[2], 10);
        }
      } else if (key === "is") {
        if (value === "open") result.isOpen = true;
        if (value === "closed") result.isOpen = false;
      } else if (key === "org") {
        result.orgSlug = value;
      } else if (key === "user") {
        result.userSlug = value;
      } else if (key === "repo") {
        result.repoName = value;
      }
    }

    result.textQuery = text.replace(/\s+/g, " ").trim();
    return result;
  }

  // Returns array of repository IDs the user has permission to read
  private async getAccessibleRepoIds(currentUserId: string): Promise<string[]> {
    const orgOwners = await prisma.organizationMember.findMany({
      where: { userId: currentUserId, role: "OWNER" },
      select: { organizationId: true }
    });
    const ownerOrgIds = orgOwners.map(m => m.organizationId);

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: currentUserId },
      select: { teamId: true }
    });
    const teamIds = teamMembers.map(m => m.teamId);

    const directPermissions = await prisma.permission.findMany({
      where: { granteeType: "USER", granteeId: currentUserId },
      select: { repositoryId: true }
    });
    const directRepoIds = directPermissions.map(p => p.repositoryId);

    const teamPermissions = await prisma.permission.findMany({
      where: { granteeType: "TEAM", granteeId: { in: teamIds } },
      select: { repositoryId: true }
    });
    const teamRepoIds = teamPermissions.map(p => p.repositoryId);

    const repos = await prisma.repository.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { ownerId: currentUserId },
          { organizationId: { in: ownerOrgIds } },
          { id: { in: [...directRepoIds, ...teamRepoIds] } }
        ]
      },
      select: { id: true }
    });

    return repos.map(r => r.id);
  }

  // Prepares search query string for Postgres to_tsquery function
  private toTsQuery(q: string): string {
    const clean = q.trim().replace(/[^\w\s-]/g, "");
    if (!clean) return "";
    return clean.split(/\s+/).map(w => `${w}:*`).join(" & ");
  }

  // Search repositories
  async searchRepositories(q: string, currentUserId: string) {
    const parsed = this.parseQuery(q);
    const repoIds = await this.getAccessibleRepoIds(currentUserId);
    if (repoIds.length === 0) return [];

    let whereClause = `WHERE r.id IN (${repoIds.map(id => `'${id}'`).join(",")})`;

    if (parsed.language) {
      // In a real system language might be a column; let's simulate/check file extension or mock
    }

    if (parsed.orgSlug) {
      whereClause += ` AND org.slug = '${parsed.orgSlug}'`;
    }

    if (parsed.userSlug) {
      whereClause += ` AND u.username = '${parsed.userSlug}'`;
    }

    const tsQuery = this.toTsQuery(parsed.textQuery);
    let selectRank = "";
    let orderBy = "r.\"createdAt\" DESC";

    if (tsQuery) {
      whereClause += ` AND r.search_vector @@ to_tsquery('english', '${tsQuery}')`;
      selectRank = `, ts_rank(r.search_vector, to_tsquery('english', '${tsQuery}')) as rank`;
      orderBy = "rank DESC";
    }

    const repos: any[] = await prisma.$queryRawUnsafe(`
      SELECT r.id, r.name, r.description, r."isPrivate", r."ownerId", r."organizationId", r."createdAt", r."updatedAt" ${selectRank}
      FROM "Repository" r
      LEFT JOIN "User" u ON r."ownerId" = u.id
      LEFT JOIN "Organization" org ON r."organizationId" = org.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 50
    `);

    // Fetch related owner/org objects
    const enriched = await Promise.all(
      repos.map(async (r) => {
        const fullRepo = await prisma.repository.findUnique({
          where: { id: r.id },
          include: {
            owner: { select: { username: true } },
            organization: { select: { slug: true } }
          }
        });
        return {
          ...r,
          owner: fullRepo?.owner,
          organization: fullRepo?.organization
        };
      })
    );

    return enriched;
  }

  // Search users and organizations
  async searchUsers(q: string) {
    const parsed = this.parseQuery(q);
    const tsQuery = this.toTsQuery(parsed.textQuery);
    
    if (!tsQuery) {
      return prisma.user.findMany({
        take: 30,
        select: { id: true, username: true, name: true, avatarUrl: true }
      });
    }

    return prisma.$queryRawUnsafe(`
      SELECT id, username, name, "avatarUrl", ts_rank(search_vector, to_tsquery('english', '${tsQuery}')) as rank
      FROM "User"
      WHERE search_vector @@ to_tsquery('english', '${tsQuery}')
      ORDER BY rank DESC
      LIMIT 30
    `);
  }

  async searchOrganizations(q: string) {
    const parsed = this.parseQuery(q);
    const queryTerm = parsed.textQuery.toLowerCase();
    
    // Simplistic search for orgs by name/slug match
    return prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: queryTerm, mode: 'insensitive' } },
          { slug: { contains: queryTerm, mode: 'insensitive' } }
        ]
      },
      take: 30
    });
  }

  // Search issues and pull requests
  async searchIssues(q: string, currentUserId: string, isPullRequest: boolean) {
    const parsed = this.parseQuery(q);
    const repoIds = await this.getAccessibleRepoIds(currentUserId);
    if (repoIds.length === 0) return [];

    let whereClause = `WHERE i."repositoryId" IN (${repoIds.map(id => `'${id}'`).join(",")})`;

    if (parsed.isOpen !== undefined) {
      whereClause += ` AND i.status = '${parsed.isOpen ? "OPEN" : "CLOSED"}'`;
    }

    if (parsed.repoName) {
      whereClause += ` AND r.name = '${parsed.repoName}'`;
    }

    const tsQuery = this.toTsQuery(parsed.textQuery);
    let selectRank = "";
    let orderBy = "i.\"createdAt\" DESC";

    const tableName = isPullRequest ? "PullRequest" : "Issue";

    if (tsQuery) {
      whereClause += ` AND i.search_vector @@ to_tsquery('english', '${tsQuery}')`;
      selectRank = `, ts_rank(i.search_vector, to_tsquery('english', '${tsQuery}')) as rank`;
      orderBy = "rank DESC";
    }

    const columns = isPullRequest 
      ? 'i.id, i.number, i.title, i.body, i.status, i."baseBranch", i."compareBranch", i."creatorId", i."repositoryId", i."createdAt", i."updatedAt"'
      : 'i.id, i.number, i.title, i.body, i.status, i."creatorId", i."repositoryId", i."createdAt", i."updatedAt"';

    const issues: any[] = await prisma.$queryRawUnsafe(`
      SELECT ${columns} ${selectRank}
      FROM "${tableName}" i
      LEFT JOIN "Repository" r ON i."repositoryId" = r.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 40
    `);

    // Fetch related creator and repository info
    return Promise.all(
      issues.map(async (i) => {
        const item = isPullRequest 
          ? await prisma.pullRequest.findUnique({
              where: { id: i.id },
              include: {
                creator: { select: { username: true, avatarUrl: true } },
                repository: { select: { name: true, organizationId: true, ownerId: true, organization: { select: { slug: true } }, owner: { select: { username: true } } } }
              }
            })
          : await prisma.issue.findUnique({
              where: { id: i.id },
              include: {
                creator: { select: { username: true, avatarUrl: true } },
                repository: { select: { name: true, organizationId: true, ownerId: true, organization: { select: { slug: true } }, owner: { select: { username: true } } } }
              }
            });
        return item;
      })
    );
  }

  // Search default-branch repository code
  async searchCode(q: string, currentUserId: string) {
    const parsed = this.parseQuery(q);
    const repoIds = await this.getAccessibleRepoIds(currentUserId);
    if (repoIds.length === 0) return [];

    let whereClause = `WHERE c."repositoryId" IN (${repoIds.map(id => `'${id}'`).join(",")})`;

    if (parsed.language) {
      const ext = `.${parsed.language.toLowerCase()}`;
      whereClause += ` AND LOWER(c."filePath") LIKE '%${ext}'`;
    }

    if (parsed.repoName) {
      whereClause += ` AND r.name = '${parsed.repoName}'`;
    }

    const tsQuery = this.toTsQuery(parsed.textQuery);
    let selectRank = "";
    let orderBy = "c.\"createdAt\" DESC";

    if (tsQuery) {
      whereClause += ` AND c.search_vector @@ to_tsquery('english', '${tsQuery}')`;
      selectRank = `, ts_rank(c.search_vector, to_tsquery('english', '${tsQuery}')) as rank`;
      orderBy = "rank DESC";
    }

    const matchedFiles: any[] = await prisma.$queryRawUnsafe(`
      SELECT c.id, c."repositoryId", c."filePath", c."contentExcerpt", c."createdAt", c."updatedAt" ${selectRank}
      FROM "CodeSearchIndex" c
      LEFT JOIN "Repository" r ON c."repositoryId" = r.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 30
    `);

    // Process excerpts and highlight matching term
    const term = parsed.textQuery;
    return Promise.all(
      matchedFiles.map(async (file) => {
        const repo = await prisma.repository.findUnique({
          where: { id: file.repositoryId },
          include: {
            owner: { select: { username: true } },
            organization: { select: { slug: true } }
          }
        });

        const lines = file.contentExcerpt.split("\n");
        const matchIndex = lines.findIndex((l: string) => l.toLowerCase().includes(term.toLowerCase()));
        
        let startLine = 1;
        let selectedExcerpt = "";

        if (matchIndex !== -1) {
          startLine = Math.max(1, matchIndex - 2 + 1);
          selectedExcerpt = lines.slice(Math.max(0, matchIndex - 2), Math.min(lines.length, matchIndex + 3)).join("\n");
        } else {
          selectedExcerpt = lines.slice(0, 5).join("\n");
        }

        return {
          id: file.id,
          filePath: file.filePath,
          excerpt: selectedExcerpt,
          startLine,
          repository: {
            name: repo?.name,
            ownerSlug: repo?.organization ? repo.organization.slug : repo?.owner?.username
          }
        };
      })
    );
  }
}
