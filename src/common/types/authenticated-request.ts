import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        accessToken?: string;
        refreshToken?: string;
        id?: string;
        email?: string;
        [key: string]: unknown;
        usermetaID?: string;
    };
}
