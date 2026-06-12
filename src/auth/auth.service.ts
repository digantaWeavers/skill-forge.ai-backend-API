import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from "axios";

import { LoginDto, RegisterDto } from 'src/dto/auth.dto';
import { User, UserDocument } from 'src/schemas/user.schema';
import { OTP, OTPDocument } from 'src/schemas/otp.schema';
import { sendEmailOtp, sendWelcomeMessage } from "src/common/middleware/email.middleware";
import { sendSmsOtp } from "src/common/middleware/sms.middleware";
import { UserMetadata, UserMetadataDocument } from 'src/schemas/userMetadata.schema';
import { Subscrbtion, SubscrbtionDocument } from 'src/schemas/subcribtion.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(OTP.name)
        private readonly otpModel: Model<OTPDocument>,
        @InjectModel(UserMetadata.name)
        private readonly userMetadataModel: Model<UserMetadataDocument>,
        @InjectModel(Subscrbtion.name)
        private readonly subscriptionModel: Model<SubscrbtionDocument>,
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

    private generatePhoneOTP(): string {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < 4; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }

        return otp;
    }

    // resgister a new user
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

            /** Rozar pay setup */
            interface RazorpayCustomer {
                id: string;
                entity: string;
                name: string | null;
                email: string;
                contact: string;
            }

            interface RazorpayCustomerListResponse {
                entity: string;
                count: number;
                items: RazorpayCustomer[];
            }

            // GET ALL CUSTOMERS
            const razorpayCustomers =
                await axios.get<RazorpayCustomerListResponse>(
                    'https://api.razorpay.com/v1/customers',
                    {
                        auth: {
                            username: process.env.ROZARPAY_API_KEY!,
                            password: process.env.ROZARPAY_SECRET_KEY!,
                        },
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );

            // FIND EXISTING CUSTOMER
            const existingRazorpayCustomer =
                razorpayCustomers.data.items.find((customer) => {
                    return (
                        customer.email === registerDto.email ||
                        customer.contact === registerDto.phoneNumber ||
                        customer.contact === `+91${registerDto.phoneNumber}`
                    );
                });

            let razorpayCustomerId = '';

            // IF CUSTOMER EXISTS
            if (existingRazorpayCustomer) {
                razorpayCustomerId = existingRazorpayCustomer.id;
            } else {
                interface RazorpayCustomerCreateResponse {
                    id: string;
                    entity: string;
                    name: string;
                    email: string;
                    contact: string;
                }

                const razorpayCustomerCreation =
                    await axios.post<RazorpayCustomerCreateResponse>(
                        'https://api.razorpay.com/v1/customers',
                        {
                            name: registerDto.fullName,
                            email: registerDto.email,
                            contact: registerDto.phoneNumber,
                        },
                        {
                            auth: {
                                username: process.env.ROZARPAY_API_KEY!,
                                password: process.env.ROZARPAY_SECRET_KEY!,
                            },
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        },
                    );

                razorpayCustomerId = razorpayCustomerCreation.data.id;
            }
            /** Rozar pay setup */

            let subscribedStatus = false;
            if (registerDto.role === 'user') {
                subscribedStatus = true;
            }

            const createdUser = await this.userModel.create({
                ...registerDto,
                rozarPayId: razorpayCustomerId,
                isSubscribed: subscribedStatus,
                password: hashedPassword,
            });

            const userMetadataObj = await this.userMetadataModel.create({
                userId: createdUser._id,
            });

            await this.subscriptionModel.create({
                userId: createdUser._id,
                userMetadataId: userMetadataObj._id,
                pgeUserId: razorpayCustomerId
            });

            const emailOtp = await this.otpModel.create({
                type: 'email_verification',
                otpVerificationFor: registerDto.email,
                otp: this.generateOTP(),
            });

            const phoneOtp = await this.otpModel.create({
                type: 'phone_verification',
                otpVerificationFor: registerDto.phoneNumber,
                otp: this.generatePhoneOTP(),
            });

            if (!emailOtp || !phoneOtp) {
                throw new BadRequestException('Failed to generate OTPs');
            }

            await sendEmailOtp(registerDto.email, emailOtp.otp);
            await sendSmsOtp(registerDto.phoneNumber!, phoneOtp.otp);

            return {
                message: 'User registered successfully',
                user: createdUser,
                otp: {
                    "emailOtp": emailOtp.otp,
                    "phoneOtp": phoneOtp.otp,
                }
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    // send OTP for email and phone verification (Optional))
    async sendOtp(email: string, phoneNumber: string) {
        try {
            const emailOtp = this.generateOTP();
            const typeEmail = 'email_verification';

            const phoneOtp = this.generatePhoneOTP();
            const typePhone = 'phone_verification';

            const otpDoc = await this.otpModel.create({
                type: typeEmail,
                otpVerificationFor: email,
                otp: emailOtp,
            });

            if (!otpDoc) {
                throw new BadRequestException('Failed to generate OTP for email verification');
            }

            const otpDocForPhone = await this.otpModel.create({
                type: typePhone,
                otpVerificationFor: phoneNumber,
                otp: phoneOtp,
            });

            if (!otpDocForPhone) {
                throw new BadRequestException('Failed to generate OTP for phone verification');
            }

            await sendEmailOtp(email, emailOtp);
            await sendSmsOtp(phoneNumber, phoneOtp);

            return {
                message: 'OTP sent successfully',
                otp: {
                    'emailOtp': emailOtp,
                    'phoneOtp': phoneOtp,
                },
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    // verify OTP for email and phone verification
    async verifyOtp(mobileOtp: string, emailOtp: string, email: string, phoneNumber: string) {
        try {
            const emailOtpDoc = await this.otpModel.findOne({
                type: 'email_verification',
                otpVerificationFor: email,
                otp: emailOtp,
            });

            if (!emailOtpDoc) {
                throw new BadRequestException('Invalid or expired email OTP');
            }

            const phoneOtpDoc = await this.otpModel.findOne({
                type: 'phone_verification',
                otpVerificationFor: phoneNumber,
                otp: mobileOtp,
            });

            if (!phoneOtpDoc) {
                throw new BadRequestException('Invalid or expired phone OTP');
            }

            const response = await axios.get(
                `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/VERIFY3/${phoneNumber}/${mobileOtp}`,
            );

            if (!response) {
                throw new Error("Invalid otp or something wrong!");
            }

            // If both OTPs are valid, you can proceed with further logic (e.g., activating the user)
            await this.otpModel.deleteMany({
                $or: [
                    { _id: emailOtpDoc._id },
                    { _id: phoneOtpDoc._id },
                ],
            });

            const updatedUser = await this.userModel.findOneAndUpdate(
                {
                    $or: [
                        { email: emailOtpDoc.otpVerificationFor },
                        { phoneNumber: phoneOtpDoc.otpVerificationFor },
                    ],
                },
                {
                    isEmailVerified: true,
                    isPhoneNumberVerified: true,
                    isActive: true,
                },
                { returnDocument: 'after' },
            );

            if (!updatedUser) {
                throw new BadRequestException('User not found for OTP verification');
            }

            const tokens = await this.generateTokens(updatedUser);

            await sendWelcomeMessage(updatedUser.email || '', updatedUser.fullName || '', updatedUser.role || '');

            return {
                message: 'OTP verified successfully',
                user: updatedUser,
                ...tokens,
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    // login a user
    async login(loginDto: LoginDto) {
        try {
            const user = await this.userModel.findOne({
                $or: [
                    { email: loginDto.email },
                ],
            });

            if (!user) {
                throw new BadRequestException('Invalid credentials');
            }

            const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

            if (!isPasswordValid) {
                throw new BadRequestException('Invalid credentials');
            }

            if (!user.isActive) {
                throw new BadRequestException('User account is not active');
            }

            const tokens = await this.generateTokens(user);

            return {
                message: 'Login successful',
                user,
                ...tokens,
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }
}