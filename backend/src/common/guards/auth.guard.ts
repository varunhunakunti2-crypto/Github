import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let username: string | undefined;

    const authHeader = request.headers.authorization || request.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('mock_token_for_')) {
        username = token.replace('mock_token_for_', '');
      } else if (token === 'mock_access_token') {
        username = 'appi';
      }
    }

    if (!username && request.headers['x-username']) {
      username = request.headers['x-username'] as string;
    }
    if (!username && request.query?.username) {
      username = request.query.username as string;
    }
    if (!username && request.body?.username) {
      username = request.body.username as string;
    }

    if (!username) {
      username = 'appi';
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (user) {
      request.user = user;
    }
    return true;
  }
}
