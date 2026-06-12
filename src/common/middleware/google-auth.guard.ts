import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    getAuthenticateOptions(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<Request>();
        const role = typeof request.query.role === 'string'
            ? request.query.role
            : 'user';

        return {
            state: role,
        };
    }
}

export class GithubAuthGuard extends AuthGuard('github') {
    getAuthenticateOptions(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<Request>();
        const role = typeof request.query.role === 'string'
            ? request.query.role
            : 'user';

        return {
            state: role,
        };
    }
}