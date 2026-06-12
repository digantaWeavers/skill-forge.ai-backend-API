import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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

    // @IsString()
    // rozarPayId?: string;

    @IsString()
    // @IsNotEmpty()
    provideType?: string;

    @IsOptional()
    @IsString()
    providerId?: string;

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
    email?: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}


export class OtpDto {
    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    otpVerificationFor?: string;

    @IsString()
    @IsNotEmpty()
    otp!: string;
}

export class AdminRegister {
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
    @MinLength(6)
    password!: string;
}

export class AdminLogin {
    @IsEmail()
    email?: string;

    @IsString()
    username?: string;

    @IsString()
    @MinLength(6)
    password!: string;
}