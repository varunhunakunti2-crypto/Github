import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>("scopes", context.getHandler());
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const pat = request.pat; // Set by AuthGuard if a PAT was used

    // If authenticated via a Personal Access Token (PAT), enforce scope checks
    if (pat) {
      const hasScope = requiredScopes.some((scope) => pat.scopes.includes(scope));
      if (!hasScope) {
        throw new ForbiddenException(
          `Personal Access Token lacks the required scope: ${requiredScopes.join(" or ")}`
        );
      }
    }

    return true;
  }
}
