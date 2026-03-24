import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type ReqUser = { userId: string; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: ReqUser }>();
    return request.user;
  },
);
