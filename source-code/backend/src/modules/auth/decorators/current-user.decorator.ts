import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type ReqUser = { sub: string; userId: string; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: ReqUser }>();
    return request.user;
  },
);
