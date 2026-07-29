import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class ProjectService {
  async listProjects(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.project.findMany({
      where: { repositoryId: repository.id },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });
  }

  async createProject(owner: string, repo: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        repositoryId: repository.id
      }
    });
  }

  async getBoard(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' }
        }
      }
    });
    if (!project) throw new NotFoundException('Project board not found');

    // Resolve details for issues/PRs
    const itemsWithDetails = await Promise.all(
      project.items.map(async (item) => {
        if (item.itemType === 'issue' && item.itemId) {
          const issue = await prisma.issue.findUnique({
            where: { id: item.itemId },
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              labels: true,
              assignees: { select: { id: true, username: true, avatarUrl: true } }
            }
          });
          return { ...item, issue };
        } else if (item.itemType === 'pull_request' && item.itemId) {
          const pr = await prisma.pullRequest.findUnique({
            where: { id: item.itemId },
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              creator: { select: { id: true, username: true, avatarUrl: true } }
            }
          });
          return { ...item, pullRequest: pr };
        }
        return item;
      })
    );

    return {
      ...project,
      items: itemsWithDetails
    };
  }

  async addItem(projectId: string, dto: any) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const lastItem = await prisma.projectItem.findFirst({
      where: { projectId, statusColumn: dto.statusColumn || 'Todo' },
      orderBy: { position: 'desc' },
      select: { position: true }
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    let itemId = dto.itemId;
    // If issueNumber/prNumber is provided instead of itemId, resolve it
    if (dto.issueNumber && !itemId) {
      const issue = await prisma.issue.findFirst({
        where: { repositoryId: project.repositoryId, number: Number(dto.issueNumber) },
        select: { id: true }
      });
      if (issue) itemId = issue.id;
    } else if (dto.prNumber && !itemId) {
      const pr = await prisma.pullRequest.findFirst({
        where: { repositoryId: project.repositoryId, number: Number(dto.prNumber) },
        select: { id: true }
      });
      if (pr) itemId = pr.id;
    }

    return prisma.projectItem.create({
      data: {
        projectId,
        itemType: dto.itemType, // 'issue', 'pull_request', 'note'
        itemId,
        noteTitle: dto.noteTitle,
        noteBody: dto.noteBody,
        statusColumn: dto.statusColumn || 'Todo',
        position
      }
    });
  }

  async updateItem(projectId: string, itemId: string, dto: any) {
    const item = await prisma.projectItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Project item not found');

    const data: any = {};
    if (dto.statusColumn !== undefined) data.statusColumn = dto.statusColumn;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.noteTitle !== undefined) data.noteTitle = dto.noteTitle;
    if (dto.noteBody !== undefined) data.noteBody = dto.noteBody;

    return prisma.projectItem.update({
      where: { id: itemId },
      data
    });
  }

  async deleteItem(projectId: string, itemId: string) {
    const item = await prisma.projectItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Project item not found');

    await prisma.projectItem.delete({ where: { id: itemId } });
    return { success: true };
  }
}
