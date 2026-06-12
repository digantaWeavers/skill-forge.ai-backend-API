
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(
        private readonly jwtService: JwtService,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Please Authenticate!');
        }

        try {
            const token = authHeader.split(' ')[1];
            const decoded = this.jwtService.verify<{ sub?: string }>(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });

            const userId = decoded?.sub;
            if (!userId) {
                throw new UnauthorizedException('Invalid token payload');
            }

            const user = await this.userModel.findById(userId).exec();
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const userObj = user.toObject() as unknown as {
                isAdminReject?: boolean;
                isActivated?: boolean;
                _id?: unknown;
                email?: string;
                username?: string;
                fullName?: string;
                role?: string;
                isSubscribed?: boolean;
                isActive?: boolean;
                [key: string]: unknown;
            };

            if (userObj.isAdminReject || userObj.isActivated === false) {
                throw new UnauthorizedException({
                    statusCode: 401,
                    message: 'Your account has been rejected by admin',
                    isRejected: true,
                });
            }

            req.user = {
                id: userObj._id?.toString?.() ?? '',
                email: userObj.email,
                username: userObj.username,
                fullName: userObj.fullName,
                role: userObj.role,
                isSubscribed: userObj.isSubscribed,
                isActive: userObj.isActive,
            };
            next();
        } catch {
            throw new UnauthorizedException({
                statusCode: 401,
                message: 'Invalid or expired token',
                isTokenValid: false,
            });
        }
    }
}
