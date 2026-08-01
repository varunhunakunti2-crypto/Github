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

    const project = await prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        repositoryId: repository.id
      }
    });

    // Create a default board view
    await prisma.projectView.create({
      data: {
        projectId: project.id,
        viewType: "board",
        name: "Default Board",
        isDefault: true,
        config: JSON.stringify({ groupBy: "status", sortBy: "position", filters: {} })
      }
    });

    return project;
  }

  async getBoard(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            assignee: { select: { id: true, username: true, avatarUrl: true } }
          }
        },
        views: true
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
        itemType: dto.itemType, // 'issue', 'pull_request', 'note' (task)
        itemId,
        noteTitle: dto.noteTitle,
        noteBody: dto.noteBody,
        statusColumn: dto.statusColumn || 'Todo',
        position,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority || null,
        isDone: dto.isDone || false,
        assigneeId: dto.assigneeId || null
      },
      include: {
        assignee: { select: { id: true, username: true, avatarUrl: true } }
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
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.isDone !== undefined) data.isDone = dto.isDone;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;

    return prisma.projectItem.update({
      where: { id: itemId },
      data,
      include: {
        assignee: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  }

  async deleteItem(projectId: string, itemId: string) {
    const item = await prisma.projectItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Project item not found');

    await prisma.projectItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  // Views Management
  async listViews(projectId: string) {
    return prisma.projectView.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createView(projectId: string, dto: any) {
    return prisma.projectView.create({
      data: {
        projectId,
        viewType: dto.viewType,
        name: dto.name,
        isDefault: dto.isDefault || false,
        config: JSON.stringify(dto.config || {})
      }
    });
  }

  async updateView(viewId: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.viewType !== undefined) data.viewType = dto.viewType;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.config !== undefined) data.config = JSON.stringify(dto.config);

    return prisma.projectView.update({
      where: { id: viewId },
      data
    });
  }

  async deleteView(viewId: string) {
    await prisma.projectView.delete({
      where: { id: viewId }
    });
    return { success: true };
  }

  // Task to Issue conversion
  async convertTaskToIssue(projectId: string, itemId: string, creatorId: string) {
    const item = await prisma.projectItem.findUnique({ where: { id: itemId } });
    if (!item || item.itemType !== "note") {
      throw new NotFoundException("Standalone task (note) not found");
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Project not found");

    // Resolve next issue number
    const lastPr = await prisma.pullRequest.findFirst({
      where: { repositoryId: project.repositoryId },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    const lastIssue = await prisma.issue.findFirst({
      where: { repositoryId: project.repositoryId },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    const nextNumber = Math.max(lastPr?.number || 0, lastIssue?.number || 0) + 1;

    // Create real Issue
    const issue = await prisma.issue.create({
      data: {
        number: nextNumber,
        title: item.noteTitle || "Converted Task",
        body: item.noteBody || "",
        status: item.isDone ? "CLOSED" : "OPEN",
        creatorId,
        repositoryId: project.repositoryId,
        assignees: item.assigneeId ? { connect: { id: item.assigneeId } } : undefined
      }
    });

    // Update ProjectItem to link to this issue
    const updatedItem = await prisma.projectItem.update({
      where: { id: itemId },
      data: {
        itemType: "issue",
        itemId: issue.id,
        noteTitle: null,
        noteBody: null
      }
    });

    return {
      ...updatedItem,
      issue
    };
  }
}
