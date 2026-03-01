import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// ── Get current user from request ────────────────────────────────────────────
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) return request.user?.[data];
    return request.user;
  },
);

// ── Roles decorator ───────────────────────────────────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
