import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class LabelService {
  async listLabels(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.label.findMany({
      where: { repositoryId: repository.id },
      include: {
        _count: {
          select: {
            issues: {
              where: { status: 'OPEN' }
            }
          }
        }
      }
    });
  }

  async createLabel(owner: string, repo: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.label.create({
      data: {
        name: dto.name,
        color: dto.color.replace('#', ''),
        description: dto.description || '',
        repositoryId: repository.id
      }
    });
  }

  async updateLabel(owner: string, repo: string, name: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const label = await prisma.label.findFirst({
      where: { repositoryId: repository.id, name }
    });
    if (!label) throw new NotFoundException('Label not found');

    return prisma.label.update({
      where: { id: label.id },
      data: {
        name: dto.name !== undefined ? dto.name : undefined,
        color: dto.color !== undefined ? dto.color.replace('#', '') : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
      }
    });
  }

  async deleteLabel(owner: string, repo: string, name: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const label = await prisma.label.findFirst({
      where: { repositoryId: repository.id, name }
    });
    if (!label) throw new NotFoundException('Label not found');

    await prisma.label.delete({
      where: { id: label.id }
    });
    return { success: true };
  }

  async listMilestones(owner: string, repo: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.milestone.findMany({
      where: { repositoryId: repository.id },
      include: {
        _count: {
          select: {
            issues: true
          }
        },
        issues: {
          select: {
            status: true
          }
        }
      }
    });
  }

  async createMilestone(owner: string, repo: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return prisma.milestone.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        repositoryId: repository.id
      }
    });
  }

  async updateMilestone(owner: string, repo: string, idOrTitle: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const milestone = await prisma.milestone.findFirst({
      where: {
        repositoryId: repository.id,
        OR: [
          { id: idOrTitle },
          { title: idOrTitle }
        ]
      }
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    return prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        title: dto.title !== undefined ? dto.title : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
      }
    });
  }

  async deleteMilestone(owner: string, repo: string, idOrTitle: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const milestone = await prisma.milestone.findFirst({
      where: {
        repositoryId: repository.id,
        OR: [
          { id: idOrTitle },
          { title: idOrTitle }
        ]
      }
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    await prisma.milestone.delete({
      where: { id: milestone.id }
    });
    return { success: true };
  }
}
