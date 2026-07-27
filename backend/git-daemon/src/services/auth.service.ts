import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
// Depending on architecture, we might use Prisma to check DB, 
// or HTTP to call the main API. Let's assume a DB or internal API call.

export interface UserContext {
  id: string;
  username: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  /**
   * Validates a Personal Access Token (PAT) or Basic Auth password.
   * In a real implementation, this queries the PostgreSQL database via Prisma
   * or delegates to an internal Redis-cached auth service.
   */
  async validateCredentials(username: string, token: string): Promise<UserContext> {
    // Mock implementation for Phase 10 integration
    if (username === 'appi' && token.startsWith('ghp_')) {
      return {
        id: 'user_1',
        username: 'appi',
        roles: ['Admin']
      };
    }
    
    // Fail auth if not valid
    throw new UnauthorizedException('Invalid credentials or token.');
  }

  /**
   * Parses the Authorization header (Basic Auth or Bearer)
   */
  async authenticateHeader(authHeader: string): Promise<UserContext> {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    if (authHeader.startsWith('Basic ')) {
      const b64auth = authHeader.split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
      return this.validateCredentials(login, password);
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Note: mapping token to user typically requires checking the PAT table.
      // Assuming a generic user for this mock.
      return this.validateCredentials('appi', token);
    }

    throw new UnauthorizedException('Unsupported authentication scheme');
  }

  /**
   * Checks if the user has the required access level for the repository.
   */
  async checkRepositoryPermission(
    user: UserContext,
    owner: string,
    repo: string,
    requiredAccess: 'read' | 'write'
  ): Promise<boolean> {
    // Phase 10: Authorization logic
    // In production: Lookup Repository -> Check RBAC rules -> Return true/false
    
    // Global Admins or Owners get full access
    if (user.username.toLowerCase() === owner.toLowerCase() || user.roles.includes('Admin')) {
      return true;
    }

    // Example mock logic: Read-only access for guests on public repos
    if (requiredAccess === 'read') {
      // We would check if repo is public here
      return true;
    }

    throw new ForbiddenException(`User ${user.username} lacks ${requiredAccess} access to ${owner}/${repo}`);
  }
}
