interface AuthUser {
    accessToken?: string;
    id?: string;
    email?: string;
    [key: string]: unknown;
}

declare namespace Express {
    export interface Request {
        user?: AuthUser;
        email?: string;
        phoneNumber?: string;
    }
}
