import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    phoneNumber?: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(['user', 'instructor'])
    role?: string;
}


export class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    username!: string;

    @IsString()
    phoneNumber!: string;

    @IsString()
    password!: string;
}


export class OtpDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(['email_verification', 'phone_verification'])
    type!: string;

    @IsString()
    otpVerificationFor?: string;

    @IsString()
    @IsNotEmpty()
    otp!: string;
}