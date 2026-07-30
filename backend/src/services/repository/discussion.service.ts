import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class DiscussionService {
  async list(owner: string, repo: string, query?: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const { category, sort, q, cursor, limit = 20 } = query || {};

    const where: any = {
      repositoryId: repository.id,
    };

    if (category && category !== 'All categories') {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Sort mapping
    let orderBy: any = { updatedAt: 'desc' }; // default: most recent activity
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'most_replied') {
      orderBy = { comments: { _count: 'desc' } };
    }

    const takeCount = Number(limit);
    const prismaQuery: any = {
      where,
      orderBy,
      take: takeCount + 1, // Get one extra to check if there is a next page
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { comments: true } }
      }
    };

    if (cursor) {
      prismaQuery.cursor = { id: cursor };
      prismaQuery.skip = 1;
    }

    const discussions = await prisma.discussion.findMany(prismaQuery);
    
    let nextCursor: string | null = null;
    if (discussions.length > takeCount) {
      const nextItem = discussions.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    // Separate pinned discussions and return them or query them separately.
    // Pinned discussions should show up at the top of the list regardless of sort,
    // so we can query them separately to always include all of them.
    const pinnedDiscussions = await prisma.discussion.findMany({
      where: {
        repositoryId: repository.id,
        isPinned: true,
        ...(category && category !== 'All categories' ? { category } : {})
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { comments: true } }
      }
    });

    // To prevent duplication, filter out pinned discussions from the paginated list
    const regularDiscussions = discussions.filter(d => !d.isPinned);

    return {
      pinned: pinnedDiscussions,
      discussions: regularDiscussions,
      nextCursor
    };
  }

  async create(owner: string, repo: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const authorUsername = dto.username || 'appi';
    const author = await prisma.user.findUnique({ where: { username: authorUsername } }) || await prisma.user.findFirst();
    if (!author) throw new NotFoundException('Author not found');

    // Generate number
    const lastDiscussion = await prisma.discussion.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    const nextNumber = (lastDiscussion?.number || 0) + 1;

    // Validate polls are only allowed for Ideas and General
    const allowedCategoriesForPolls = ['Ideas', 'General'];
    const hasPoll = dto.pollOptions && dto.pollOptions.length >= 2;
    if (hasPoll && !allowedCategoriesForPolls.includes(dto.category)) {
      throw new BadRequestException('Polls are only allowed in Ideas or General categories');
    }

    const discussion = await prisma.discussion.create({
      data: {
        number: nextNumber,
        category: dto.category,
        title: dto.title,
        body: dto.body || '',
        authorId: author.id,
        repositoryId: repository.id,
        allowMultiplePollVotes: !!dto.allowMultiplePollVotes
      }
    });

    if (hasPoll) {
      await Promise.all(
        dto.pollOptions.map((text: string, index: number) => {
          return prisma.pollOption.create({
            data: {
              discussionId: discussion.id,
              text,
              position: index
            }
          });
        })
      );
    }

    return this.findOne(owner, repo, nextNumber, author.id);
  }

  async findOne(owner: string, repo: string, number: number, currentUserIdOrUsername?: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const discussion = await prisma.discussion.findFirst({
      where: {
        repositoryId: repository.id,
        number: Number(number)
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        pollOptions: {
          orderBy: { position: 'asc' },
          include: {
            votes: {
              select: {
                userId: true
              }
            }
          }
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } }
          }
        },
        answeredComment: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } }
          }
        }
      }
    });

    if (!discussion) throw new NotFoundException('Discussion not found');

    // Resolve current user ID
    let currentUserId = '';
    if (currentUserIdOrUsername) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: currentUserIdOrUsername },
            { username: currentUserIdOrUsername }
          ]
        }
      });
      if (user) currentUserId = user.id;
    }

    // Format poll options with stats and user vote status
    const pollOptionsWithStats = discussion.pollOptions.map(option => {
      const voteCount = option.votes.length;
      const userVoted = option.votes.some(v => v.userId === currentUserId);
      return {
        id: option.id,
        text: option.text,
        position: option.position,
        voteCount,
        userVoted
      };
    });

    const totalVotes = pollOptionsWithStats.reduce((sum, opt) => sum + opt.voteCount, 0);

    return {
      ...discussion,
      pollOptions: pollOptionsWithStats,
      totalVotes
    };
  }

  async update(owner: string, repo: string, number: number, dto: any, username: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const discussion = await prisma.discussion.findFirst({
      where: {
        repositoryId: repository.id,
        number: Number(number)
      }
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    // Check permissions if needed. Maintainer check: repo owner or collaborator
    // For local dev, we allow anyone to edit or restrict to author.
    // If updating pin status: only repo owner/maintainer. In this context, we can allow repo owner or 'appi'.
    const isRepoOwner = repository.ownerId === username || owner === username;
    const isAuthor = discussion.authorId === username;

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.isPinned !== undefined) {
      // Only repo owner/maintainer/appi can pin
      if (!isRepoOwner && username !== 'appi') {
        throw new ForbiddenException('Only repository maintainers can pin discussions');
      }
      data.isPinned = dto.isPinned;
    }

    const updated = await prisma.discussion.update({
      where: { id: discussion.id },
      data
    });

    return this.findOne(owner, repo, number, username);
  }

  async createComment(owner: string, repo: string, number: number, username: string, dto: any) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const discussion = await prisma.discussion.findFirst({
      where: { repositoryId: repository.id, number: Number(number) }
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const user = await prisma.user.findUnique({ where: { username } }) || await prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');

    const comment = await prisma.comment.create({
      data: {
        body: dto.body,
        userId: user.id,
        discussionId: discussion.id
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Touch the discussion updatedAt to update last activity
    await prisma.discussion.update({
      where: { id: discussion.id },
      data: { updatedAt: new Date() }
    });

    return comment;
  }

  async updateComment(commentId: string, username: string, body: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    if (updated.discussionId) {
      await prisma.discussion.update({
        where: { id: updated.discussionId },
        data: { updatedAt: new Date() }
      });
    }

    return updated;
  }

  async deleteComment(commentId: string, username: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const discussionId = comment.discussionId;

    await prisma.comment.delete({ where: { id: commentId } });

    if (discussionId) {
      await prisma.discussion.update({
        where: { id: discussionId },
        data: { updatedAt: new Date() }
      });
    }

    return { success: true };
  }

  async vote(owner: string, repo: string, number: number, username: string, dto: { optionIds: string[] }) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const discussion = await prisma.discussion.findFirst({
      where: { repositoryId: repository.id, number: Number(number) },
      include: { pollOptions: true }
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const user = await prisma.user.findUnique({ where: { username } }) || await prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');

    const optionIds = dto.optionIds || [];

    // Check option validity
    const discussionOptionIds = discussion.pollOptions.map(o => o.id);
    const validOptions = optionIds.filter(id => discussionOptionIds.includes(id));

    if (validOptions.length === 0 && optionIds.length > 0) {
      throw new BadRequestException('Invalid poll option selected');
    }

    if (!discussion.allowMultiplePollVotes) {
      // Single-select: user can only have at most one vote in this discussion
      // Clear previous votes
      await prisma.pollVote.deleteMany({
        where: {
          userId: user.id,
          pollOption: {
            discussionId: discussion.id
          }
        }
      });

      if (validOptions.length > 0) {
        // Vote for the first valid option
        await prisma.pollVote.create({
          data: {
            pollOptionId: validOptions[0],
            userId: user.id
          }
        });
      }
    } else {
      // Multi-select: toggle votes for the selected options
      for (const optId of validOptions) {
        const existingVote = await prisma.pollVote.findUnique({
          where: {
            pollOptionId_userId: {
              pollOptionId: optId,
              userId: user.id
            }
          }
        });

        if (existingVote) {
          await prisma.pollVote.delete({
            where: { id: existingVote.id }
          });
        } else {
          await prisma.pollVote.create({
            data: {
              pollOptionId: optId,
              userId: user.id
            }
          });
        }
      }
    }

    return this.findOne(owner, repo, number, user.id);
  }

  async markAnswer(owner: string, repo: string, number: number, username: string, dto: { commentId: string }) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const discussion = await prisma.discussion.findFirst({
      where: { repositoryId: repository.id, number: Number(number) }
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    if (discussion.category !== 'Q&A') {
      throw new BadRequestException('Only Q&A discussions can have marked answers');
    }

    const user = await prisma.user.findUnique({ where: { username } }) || await prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');

    // Only author or repository owner can mark
    const isRepoOwner = repository.ownerId === user.id || owner === username;
    const isAuthor = discussion.authorId === user.id;

    if (!isRepoOwner && !isAuthor && username !== 'appi') {
      throw new ForbiddenException('Only the author or repository owner can mark the answer');
    }

    const { commentId } = dto;
    if (!commentId) {
      // Unmark answer
      await prisma.discussion.update({
        where: { id: discussion.id },
        data: { answeredCommentId: null }
      });
    } else {
      // Verify comment belongs to this discussion
      const comment = await prisma.comment.findUnique({
        where: { id: commentId }
      });
      if (!comment || comment.discussionId !== discussion.id) {
        throw new BadRequestException('Comment does not belong to this discussion');
      }

      await prisma.discussion.update({
        where: { id: discussion.id },
        data: { answeredCommentId: commentId }
      });
    }

    return this.findOne(owner, repo, number, user.id);
  }
}
