import { IsOptional, IsString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkDto {
    @IsString()
    platform!: string;

    @IsString()
    url!: string;
}

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    fullName?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsString()
    @IsOptional()
    profilePicture?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })  // ✅ validates each object in array
    @Type(() => SocialLinkDto)       // ✅ transforms plain object to SocialLinkDto class
    socialLinks?: SocialLinkDto[];
}

export class UpdatePasswordDto {
    @IsString()
    @IsNotEmpty()
    currentPassword!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    newPassword!: string;
}