import { Body, Req, Res, Controller, Post, UseGuards, Get } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from 'src/dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { GithubAuthGuard, GoogleAuthGuard } from 'src/common/middleware/google-auth.guard';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request';

@Controller('')
export class AuthController {
    constructor(
        private authService: AuthService
    ) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return await this.authService.register(registerDto);
    }

    @Post('send-otp')
    async sendOtp(@Body() otpDto: { email: string; phoneNumber: string }) {
        return await this.authService.sendOtp(otpDto.email, otpDto.phoneNumber);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() otpDto: { mobileOtp: string; emailOtp: string; email: string; phoneNumber: string }) {
        return await this.authService.verifyOtp(otpDto.mobileOtp, otpDto.emailOtp, otpDto.email, otpDto.phoneNumber);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    // google signin auth
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    googleLogin() { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    googleCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
        const token = req.user?.accessToken || '';
        const refreshToken = req.user?.refreshToken || '';
        res.redirect(
            `${process.env.FRONTEND_URL}/social-auth-success?accessToken=${token}&refreshToken=${refreshToken}`
        );
    }

    // github signin auth
    @Get('github')
    @UseGuards(GithubAuthGuard)
    githubLogin() { }

    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    githubCallback(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const token = req.user?.accessToken || '';
        const refreshToken = req.user?.refreshToken || '';

        res.redirect(
            `${process.env.FRONTEND_URL}/social-auth-success?accessToken=${token}&refreshToken=${refreshToken}`,
        );
    }
}
