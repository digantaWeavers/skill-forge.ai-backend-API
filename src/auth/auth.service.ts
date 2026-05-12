import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { RegisterDto } from 'src/dto/auth.dto';
import { User, UserDocument } from 'src/schemas/user.schema';
import { OTP, OTPDocument } from 'src/schemas/otp.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(OTP.name)
        private readonly otpModel: Model<OTPDocument>,
        private readonly jwtService: JwtService,
    ) { }

    // generate JWT tokens for a user
    private async generateTokens(user: UserDocument) {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            username: user.username,
        };

        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets are not defined');
        }

        const accessOptions: JwtSignOptions = {
            secret: accessSecret,
            expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as StringValue,
        };

        const refreshOptions: JwtSignOptions = {
            secret: refreshSecret,
            expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as StringValue,
        };

        const accessToken = await this.jwtService.signAsync(
            payload,
            accessOptions,
        );

        const refreshToken = await this.jwtService.signAsync(
            payload,
            refreshOptions,
        );

        return {
            accessToken,
            refreshToken,
        };
    }


    //generate OTP
    private generateOTP(): string {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < 6; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }

        return otp;
    }


    async register(registerDto: RegisterDto) {
        try {
            const existingUserByEmail = await this.userModel.findOne({
                email: registerDto.email,
            });

            if (existingUserByEmail) {
                throw new BadRequestException('Email already exists');
            }

            const existingUserByUsername = await this.userModel.findOne({
                username: registerDto.username,
            });

            if (existingUserByUsername) {
                throw new BadRequestException('Username already exists');
            }

            const existingUserByPhoneNumber = await this.userModel.findOne({
                phoneNumber: registerDto.phoneNumber,
            });

            if (existingUserByPhoneNumber) {
                throw new BadRequestException('Phone number already exists');
            }

            const hashedPassword = await bcrypt.hash(registerDto.password, 10);

            const createdUser = await this.userModel.create({
                ...registerDto,
                password: hashedPassword,
            });

            const emailOtp = await this.otpModel.create({
                type: 'email_verification',
                otpVerificationFor: registerDto.email,
                otp: this.generateOTP(),
            });

            const phoneOtp = await this.otpModel.create({
                type: 'phone_verification',
                otpVerificationFor: registerDto.phoneNumber,
                otp: this.generateOTP(),
            });

            if (!emailOtp || !phoneOtp) {
                throw new BadRequestException('Failed to generate OTPs');
            }

            const tokens = await this.generateTokens(createdUser);

            return {
                message: 'User registered successfully',
                user: createdUser,
                ...tokens,
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    // async sendOtp(email: string,  type: string) {

    // }
}