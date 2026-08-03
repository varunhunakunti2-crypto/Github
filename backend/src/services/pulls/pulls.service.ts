import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@gitforge/database';
import { PrStatus } from '@prisma/client';


@Injectable()
export class PullsService {
  // In-memory mock storage for reviews
  private reviewsStore: Array<{
    id: string;
    prId: string;
    reviewer: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    body: string;
    createdAt: Date;
  }> = [];

  async createReview(owner: string, repo: string, number: number, reviewer: string, dto: {
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    body?: string;
  }) {
    const pr = await this.getPullRequest(owner, repo, number);

    // Reviewer validation: cannot approve own PR
    if (pr.creator.username === reviewer && (dto.event === 'APPROVE' || dto.event === 'REQUEST_CHANGES')) {
      throw new BadRequestException('You cannot approve or request changes on your own pull request.');
    }

    const review = {
      id: Math.random().toString(36).substr(2, 9),
      prId: pr.id,
      reviewer,
      event: dto.event,
      body: dto.body || '',
      createdAt: new Date()
    };

    this.reviewsStore.push(review);

    // Add a timeline event as a comment too, so it renders in the activity stream
    await prisma.comment.create({
      data: {
        body: `[Review: ${dto.event}] ${dto.body || ''}`,
        userId: pr.creatorId, // Mock user reference
        pullRequestId: pr.id
      }
    });

    return review;
  }

  async getReviews(owner: string, repo: string, number: number) {
    const pr = await this.getPullRequest(owner, repo, number);
    return this.reviewsStore.filter(r => r.prId === pr.id);
  }
  async createPullRequest(owner: string, repo: string, creatorUsername: string, dto: {
    title: string;
    body?: string;
    base: string;
    head: string;
    draft?: boolean;
    reviewers?: string[];
  }) {
    // Find repository
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    // Find creator
    const creator = await prisma.user.findUnique({
      where: { username: creatorUsername }
    });
    if (!creator) throw new NotFoundException('Creator user not found');

    // Calculate sequential PR number
    const lastPr = await prisma.pullRequest.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { number: 'desc' }
    });
    const prNumber = lastPr ? lastPr.number + 1 : 1;

    // Create the PR
    const pr = await prisma.pullRequest.create({
      data: {
        number: prNumber,
        title: dto.title,
        body: dto.body || '',
        status: dto.draft ? 'DRAFT' : 'OPEN',
        baseBranch: dto.base,
        compareBranch: dto.head,
        creatorId: creator.id,
        repositoryId: repository.id,
      },
      include: {
        creator: { select: { id: true, username: true, email: true } },
        repository: true
      }
    });

    return pr;
  }

  async getPullRequests(owner: string, repo: string, status?: string) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    return await prisma.pullRequest.findMany({
      where: {
        repositoryId: repository.id,
        ...(status ? { status: status as PrStatus } : {})
      },
      include: {
        creator: { select: { id: true, username: true } }
      },
      orderBy: { number: 'desc' }
    });
  }

  async getPullRequest(owner: string, repo: string, number: number) {
    const repository = await prisma.repository.findFirst({
      where: {
        name: repo,
        owner: { username: owner }
      }
    });
    if (!repository) throw new NotFoundException('Repository not found');

    const pr = await prisma.pullRequest.findFirst({
      where: {
        repositoryId: repository.id,
        number
      },
      include: {
        creator: { select: { id: true, username: true, email: true } },
        comments: {
          include: {
            user: { select: { id: true, username: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!pr) throw new NotFoundException('Pull request not found');
    return pr;
  }

  async updatePullRequest(owner: string, repo: string, number: number, dto: {
    title?: string;
    body?: string;
    status?: string;
  }) {
    const pr = await this.getPullRequest(owner, repo, number);

    return await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.status ? { status: dto.status as PrStatus } : {}),
      }
    });
  }

  async createComment(owner: string, repo: string, number: number, username: string, dto: {
    body: string;
    filePath?: string;
    diffLine?: number;
  }) {
    const pr = await this.getPullRequest(owner, repo, number);
    
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) throw new NotFoundException('User not found');

    return await prisma.comment.create({
      data: {
        body: dto.body,
        userId: user.id,
        pullRequestId: pr.id,
        filePath: dto.filePath,
        diffLine: dto.diffLine,
      },
      include: {
        user: { select: { id: true, username: true } }
      }
    });
  }

  async updateComment(commentId: string, username: string, body: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.username !== username) {
      throw new BadRequestException('You can only edit your own comments.');
    }

    return await prisma.comment.update({
      where: { id: commentId },
      data: { body },
      include: {
        user: { select: { id: true, username: true } }
      }
    });
  }

  async deleteComment(commentId: string, username: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.username !== username) {
      throw new BadRequestException('You can only delete your own comments.');
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async mergePullRequest(owner: string, repo: string, number: number, dto: {
    merge_method?: 'merge' | 'squash' | 'rebase';
    commit_title?: string;
  }) {
    const pr = await this.getPullRequest(owner, repo, number);

    if (pr.status !== 'OPEN') {
      throw new BadRequestException('Pull Request is not in a mergeable state. Current status: ' + pr.status);
    }

    // Server-side approval enforcement
    const reviews = this.reviewsStore.filter(r => r.prId === pr.id);
    const latestByReviewer: Record<string, typeof reviews[0]> = {};
    reviews
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .forEach(r => { latestByReviewer[r.reviewer] = r; });
    
    const latestReviews = Object.values(latestByReviewer);
    const approvals = latestReviews.filter(r => r.event === 'APPROVE');
    const changesRequested = latestReviews.filter(r => r.event === 'REQUEST_CHANGES');

    if (approvals.length < 1) {
      throw new BadRequestException('Cannot merge: requires at least 1 approval. Currently has ' + approvals.length + '.');
    }
    if (changesRequested.length > 0) {
      throw new BadRequestException('Cannot merge: ' + changesRequested.length + ' reviewer(s) have requested changes.');
    }

    const strategy = dto.merge_method || 'merge';
    const commitMessage = dto.commit_title || `${pr.title} (#${pr.number})`;

    // Call git-daemon performMerge
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_bypass_token'
      },
      body: JSON.stringify({
        base: pr.baseBranch,
        head: pr.compareBranch,
        strategy,
        message: commitMessage,
        isPrMerge: true
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as any;
      throw new BadRequestException(errData.message || 'Git merge operation failed.');
    }

    const mergeResult = await res.json() as any;
    if (mergeResult.success === false) {
      throw new BadRequestException(mergeResult.message || 'Merge failed due to conflicts.');
    }

    // Update PR status in database
    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: { status: 'MERGED' }
    });

    // Auto-close linked issues
    const issueRegex = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;
    const textToSearch = `${pr.body || ''} ${commitMessage}`;
    const issueMatches = [...textToSearch.matchAll(issueRegex)];
    const issueNumbersToClose = [...new Set(issueMatches.map(m => parseInt(m[1], 10)))];

    if (issueNumbersToClose.length > 0) {
      for (const issueNum of issueNumbersToClose) {
        await prisma.issue.updateMany({
          where: { repositoryId: pr.repositoryId, number: issueNum },
          data: { status: 'CLOSED' }
        });
      }
    }

    // Create a system comment representing the merge event
    await prisma.comment.create({
      data: {
        body: `[Review: MERGED] Merged branch ${pr.compareBranch} into ${pr.baseBranch} using strategy ${strategy}. Merge Commit: ${mergeResult.hash || 'N/A'}`,
        userId: pr.creatorId,
        pullRequestId: pr.id
      }
    });

    return { merged: true, hash: mergeResult.hash };
  }
}
