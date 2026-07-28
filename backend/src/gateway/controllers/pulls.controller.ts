import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { PullsService } from '../../services/pulls/pulls.service';


@Controller('repositories/:owner/:repo/pulls')
export class PullsController {
  constructor(private readonly pullsService: PullsService) {}

  @Post()
  async create(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() dto: any
  ) {
    // Default to appi or first user if auth/session is mock
    const creatorUsername = dto.creator || 'appi';
    return await this.pullsService.createPullRequest(owner, repo, creatorUsername, dto);
  }

  @Get()
  async list(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('state') state?: string
  ) {
    let status: string | undefined;
    if (state === 'open') status = 'OPEN';
    if (state === 'closed') status = 'CLOSED';
    if (state === 'merged') status = 'MERGED';
    if (state === 'draft') status = 'DRAFT';
    return await this.pullsService.getPullRequests(owner, repo, status);
  }

  @Get(':number')
  async findOne(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string
  ) {
    return await this.pullsService.getPullRequest(owner, repo, parseInt(number, 10));
  }

  @Patch(':number')
  async update(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() dto: any
  ) {
    return await this.pullsService.updatePullRequest(owner, repo, parseInt(number, 10), dto);
  }

  @Post(':number/reviews')
  async createReview(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() dto: any
  ) {
    const reviewer = dto.reviewer || 'appi';
    return await this.pullsService.createReview(owner, repo, parseInt(number, 10), reviewer, dto);
  }

  @Get(':number/reviews')
  async getReviews(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string
  ) {
    return await this.pullsService.getReviews(owner, repo, parseInt(number, 10));
  }

  @Post(':number/comments')
  async createComment(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return await this.pullsService.createComment(owner, repo, parseInt(number, 10), username, dto);
  }

  @Patch('comments/:id')
  async updateComment(
    @Param('id') id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return await this.pullsService.updateComment(id, username, dto.body);
  }

  @Delete('comments/:id')
  async deleteComment(
    @Param('id') id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return await this.pullsService.deleteComment(id, username);
  }

  @Put(':number/merge')
  async merge(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() dto: any
  ) {
    return await this.pullsService.mergePullRequest(owner, repo, parseInt(number, 10), dto);
  }
}
