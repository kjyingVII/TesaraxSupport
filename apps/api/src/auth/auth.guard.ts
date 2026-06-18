import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY, ROLES_KEY } from "./auth.decorators";

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization ?? (request.query.accessToken ? `Bearer ${request.query.accessToken}` : undefined);
    const user = await this.authService.getUserFromAuthorization(authorization);
    request.user = user;

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (roles?.length && !roles.includes(user.role)) {
      throw new UnauthorizedException("User role is not allowed.");
    }

    return true;
  }
}
