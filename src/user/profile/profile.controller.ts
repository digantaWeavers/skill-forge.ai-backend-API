import { BadRequestException, Body, Controller, Get, Patch, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request';
import { UpdatePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { storage } from 'src/common/middleware/cloudinary.middleware';  // ✅ add this import

@Controller('')
export class ProfileController {
    constructor(
        private profileService: ProfileService
    ) { }

    @Get('me')
    async getProfileController(
        @Req() req: AuthenticatedRequest,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not authenticated');
        return await this.profileService.getProfile(userId);
    }

    @Patch('update')
    @UseInterceptors(FileInterceptor('file', { storage }))
    async updateProfileController(
        @Req() req: AuthenticatedRequest,
        @Body() updateUser: UpdateProfileDto,
        @UploadedFile() file: Express.Multer.File & { path: string; filename: string },
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not authenticated');

        if (file) {
            // Multer + Cloudinary — URL is in file.path
            updateUser.profilePicture = file.path;
        }
        return await this.profileService.updateProfile(userId, updateUser);
    }

    @Patch('update-password')
    async updatePassword(@Req() req: AuthenticatedRequest, @Body() passwordinfo: UpdatePasswordDto) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not authenticated');

        return await this.profileService.updatePassword(userId, passwordinfo);
    }
}
