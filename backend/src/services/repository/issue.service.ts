import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class IssueService {
  async list(owner: string, repo: string, query?: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const { state, label, assignee, milestone, q, sort } = query || {};

    const where: any = {
      repositoryId: repository.id,
    };

    if (state) {
      where.status = state.toUpperCase() === 'CLOSED' ? 'CLOSED' : 'OPEN';
    }

    if (label) {
      where.labels = {
        some: {
          name: label
        }
      };
    }

    if (assignee) {
      where.assignees = {
        some: {
          username: assignee
        }
      };
    }

    if (milestone) {
      where.milestone = {
        title: milestone
      };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'most_commented') {
      orderBy = { comments: { _count: 'desc' } };
    } else if (sort === 'recently_updated') {
      orderBy = { updatedAt: 'desc' };
    }

    return prisma.issue.findMany({
      where,
      orderBy,
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        assignees: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
        milestone: true,
        _count: { select: { comments: true } }
      }
    });
  }

  async create(owner: string, repo: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const creator = await prisma.user.findUnique({
      where: { username: dto.creatorUsername || dto.username }
    }) || await prisma.user.findFirst();
    if (!creator) throw new NotFoundException('Creator not found');

    const lastPr = await prisma.pullRequest.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    const lastIssue = await prisma.issue.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    const nextNumber = Math.max(lastPr?.number || 0, lastIssue?.number || 0) + 1;

    // Resolve labels, assignees, milestone if provided in dto
    const labelConnect = dto.labels ? {
      connect: await prisma.label.findMany({
        where: { repositoryId: repository.id, name: { in: dto.labels } },
        select: { id: true }
      }).then(labels => labels.map(l => ({ id: l.id })))
    } : undefined;

    const assigneeConnect = dto.assignees ? {
      connect: await prisma.user.findMany({
        where: { username: { in: dto.assignees } },
        select: { id: true }
      }).then(users => users.map(u => ({ id: u.id })))
    } : undefined;

    let milestoneId: string | undefined = undefined;
    if (dto.milestone) {
      const ms = await prisma.milestone.findFirst({
        where: { repositoryId: repository.id, title: dto.milestone }
      });
      if (ms) {
        milestoneId = ms.id;
      }
    }

    const issue = await prisma.issue.create({
      data: {
        number: nextNumber,
        title: dto.title,
        body: dto.body || '',
        creatorId: creator.id,
        repositoryId: repository.id,
        labels: labelConnect,
        assignees: assigneeConnect,
        milestoneId: milestoneId,
      },
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        assignees: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
        milestone: true,
        comments: true
      }
    });

    // Create system timeline comment for creation
    await prisma.comment.create({
      data: {
        body: `created this issue`,
        userId: creator.id,
        issueId: issue.id,
        isEvent: true,
        eventType: 'created'
      }
    });

    return issue;
  }

  async findOne(owner: string, repo: string, number: number) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const issue = await prisma.issue.findFirst({
      where: {
        repositoryId: repository.id,
        number: Number(number)
      },
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        assignees: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
        milestone: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } }
          }
        }
      }
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async update(owner: string, repo: string, number: number, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const issue = await prisma.issue.findFirst({
      where: { repositoryId: repository.id, number: Number(number) },
      include: {
        labels: true,
        assignees: true,
        milestone: true
      }
    });
    if (!issue) throw new NotFoundException('Issue not found');

    const updater = await prisma.user.findUnique({
      where: { username: dto.username }
    }) || await prisma.user.findFirst();
    if (!updater) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.status !== undefined) {
      data.status = dto.status;
      // Add state change event
      await prisma.comment.create({
        data: {
          body: dto.status === 'CLOSED' ? 'closed this issue' : 'reopened this issue',
          userId: updater.id,
          issueId: issue.id,
          isEvent: true,
          eventType: 'status_changed',
          eventMetadata: JSON.stringify({ status: dto.status })
        }
      });
    }

    if (dto.labels !== undefined) {
      data.labels = {
        set: await prisma.label.findMany({
          where: { repositoryId: repository.id, name: { in: dto.labels } },
          select: { id: true }
        }).then(labels => labels.map(l => ({ id: l.id })))
      };
      
      // Compute delta for timeline event
      const originalNames = issue.labels.map(l => l.name);
      const added = dto.labels.filter((n: string) => !originalNames.includes(n));
      const removed = originalNames.filter((n: string) => !dto.labels.includes(n));
      for (const name of added) {
        await prisma.comment.create({
          data: {
            body: `added the ${name} label`,
            userId: updater.id,
            issueId: issue.id,
            isEvent: true,
            eventType: 'labeled',
            eventMetadata: JSON.stringify({ action: 'add', label: name })
          }
        });
      }
      for (const name of removed) {
        await prisma.comment.create({
          data: {
            body: `removed the ${name} label`,
            userId: updater.id,
            issueId: issue.id,
            isEvent: true,
            eventType: 'labeled',
            eventMetadata: JSON.stringify({ action: 'remove', label: name })
          }
        });
      }
    }

    if (dto.assignees !== undefined) {
      data.assignees = {
        set: await prisma.user.findMany({
          where: { username: { in: dto.assignees } },
          select: { id: true }
        }).then(users => users.map(u => ({ id: u.id })))
      };

      const originalNames = issue.assignees.map(u => u.username);
      const added = dto.assignees.filter((n: string) => !originalNames.includes(n));
      const removed = originalNames.filter((n: string) => !dto.assignees.includes(n));
      for (const name of added) {
        await prisma.comment.create({
          data: {
            body: `assigned ${name}`,
            userId: updater.id,
            issueId: issue.id,
            isEvent: true,
            eventType: 'assigned',
            eventMetadata: JSON.stringify({ action: 'add', assignee: name })
          }
        });
      }
      for (const name of removed) {
        await prisma.comment.create({
          data: {
            body: `removed assignee ${name}`,
            userId: updater.id,
            issueId: issue.id,
            isEvent: true,
            eventType: 'assigned',
            eventMetadata: JSON.stringify({ action: 'remove', assignee: name })
          }
        });
      }
    }

    if (dto.milestone !== undefined) {
      if (dto.milestone === null) {
        data.milestone = { disconnect: true };
        if (issue.milestone) {
          await prisma.comment.create({
            data: {
              body: `removed this issue from the ${issue.milestone.title} milestone`,
              userId: updater.id,
              issueId: issue.id,
              isEvent: true,
              eventType: 'milestoned',
              eventMetadata: JSON.stringify({ action: 'remove', milestone: issue.milestone.title })
            }
          });
        }
      } else {
        const ms = await prisma.milestone.findFirst({
          where: { repositoryId: repository.id, title: dto.milestone }
        });
        if (ms) {
          data.milestone = { connect: { id: ms.id } };
          await prisma.comment.create({
            data: {
              body: `added this issue to the ${ms.title} milestone`,
              userId: updater.id,
              issueId: issue.id,
              isEvent: true,
              eventType: 'milestoned',
              eventMetadata: JSON.stringify({ action: 'add', milestone: ms.title })
            }
          });
        }
      }
    }

    return prisma.issue.update({
      where: { id: issue.id },
      data,
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        assignees: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
        milestone: true
      }
    });
  }

  async createComment(owner: string, repo: string, number: number, username: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const issue = await prisma.issue.findFirst({
      where: { repositoryId: repository.id, number: Number(number) }
    });
    if (!issue) throw new NotFoundException('Issue not found');

    const user = await prisma.user.findUnique({ where: { username } }) || await prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');

    return prisma.comment.create({
      data: {
        body: dto.body,
        userId: user.id,
        issueId: issue.id
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  }

  async updateComment(commentId: string, username: string, body: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    if (!comment) throw new NotFoundException('Comment not found');

    return prisma.comment.update({
      where: { id: commentId },
      data: { body },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  }

  async deleteComment(commentId: string, username: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }
}
