import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscrbtion, SubscrbtionDocument } from 'src/schemas/subcribtion.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UserMetadata, UserMetadataDocument } from 'src/schemas/userMetadata.schema';
import { UpdatePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import cloudinary from 'src/common/types/cloudinary.config';

@Injectable()
export class ProfileService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(UserMetadata.name)
        private readonly userMetadataModel: Model<UserMetadataDocument>,
        @InjectModel(Subscrbtion.name)
        private readonly subscriptionModel: Model<SubscrbtionDocument>,
    ) { }

    // ✅ Helper — detects base64 and uploads to Cloudinary, returns URL
    private async resolveProfilePicture(input: string): Promise<string> {
        // Already a URL — return as is
        if (input.startsWith('http://') || input.startsWith('https://')) {
            return input;
        }

        // Base64 string — upload to Cloudinary
        if (input.startsWith('data:image/')) {
            const uploadResult = await cloudinary.uploader.upload(input, {
                folder: 'my-app/profile-pictures',
                resource_type: 'image',
                public_id: `profile_${Date.now()}`,
            });
            return uploadResult.secure_url;  // ✅ returns Cloudinary HTTPS URL
        }

        // Fallback — return as is
        return input;
    }

    async getProfile(userId: string) {
        const user = await this.userModel.findById(userId).select('-password -__v').lean();
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const userMetadata = await this.userMetadataModel.findOne({ userId }).select('-__v').lean();
        const subscription = await this.subscriptionModel.findOne({ userId }).select('-__v').lean();

        return {
            message: 'Profile fetched successfully',
            data: {
                ...user,
                metadata: userMetadata,
                subscription,
            }
        };
    }

    async updateProfile(userId: string, updateData: UpdateProfileDto) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (updateData.username) {
            throw new BadRequestException('Username cannot be updated');
        }

        // ✅ Resolve profilePicture — handles base64, url, or file (already resolved in controller)
        let resolvedProfilePicture: string | undefined = undefined;
        if (updateData.profilePicture) {
            try {
                resolvedProfilePicture = await this.resolveProfilePicture(updateData.profilePicture);
            } catch {
                throw new BadRequestException('Failed to upload profile picture');
            }
        }

        // Only call Razorpay if relevant fields provided
        if (updateData.fullName || updateData.email || updateData.phoneNumber) {
            const razorpayCustomerUpdate = await axios.put(
                `https://api.razorpay.com/v1/customers/${user.rozarPayId}`,
                {
                    ...(updateData.fullName && { name: updateData.fullName }),
                    ...(updateData.email && { email: updateData.email }),
                    ...(updateData.phoneNumber && { contact: updateData.phoneNumber }),
                },
                {
                    auth: {
                        username: process.env.ROZARPAY_API_KEY!,
                        password: process.env.ROZARPAY_SECRET_KEY!,
                    },
                    headers: { 'Content-Type': 'application/json' },
                },
            );

            if (razorpayCustomerUpdate.status !== 200) {
                throw new BadRequestException('Failed to update Razorpay customer');
            }
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            {
                ...(updateData.fullName && { fullName: updateData.fullName }),
                ...(updateData.email && { email: updateData.email }),
                ...(updateData.phoneNumber && { phoneNumber: updateData.phoneNumber }),
            },
            { returnDocument: 'after', select: '-password -__v' },
        ).lean();

        if (!updatedUser) {
            throw new BadRequestException('Failed to update user profile');
        }

        const userMetadata = await this.userMetadataModel.findOneAndUpdate(
            { userId: updatedUser._id },
            {
                ...(resolvedProfilePicture && { profilePicture: resolvedProfilePicture }), // ✅ resolved URL
                ...(updateData.address && { address: updateData.address }),
                ...(updateData.socialLinks && { socialLinks: updateData.socialLinks }),
            },
            { returnDocument: 'after', select: '-__v' },
        ).lean();

        return {
            message: 'Profile updated successfully',
            data: {
                ...updatedUser,
                metadata: userMetadata,
            },
        };
    }

    async updatePassword(userId: string, updatePasswordData: UpdatePasswordDto) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const isMatch = await bcrypt.compare(updatePasswordData.currentPassword, user.password);
        if (!isMatch) {
            throw new BadRequestException('Current password is incorrect');
        }

        if (updatePasswordData.password === updatePasswordData.currentPassword) {
            throw new BadRequestException('New password must be different from current password');
        }

        if (updatePasswordData.password !== updatePasswordData.newPassword) {
            throw new BadRequestException('Both password should be same');
        }

        const hashedNewPassword = await bcrypt.hash(updatePasswordData.newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        return {
            message: 'Password updated successfully'
        };
    }

}
