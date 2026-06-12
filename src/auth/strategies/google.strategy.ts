import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { StringValue } from 'ms';
import { Strategy, Profile } from 'passport-google-oauth20';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { sendWelcomeMessage } from 'src/common/middleware/email.middleware';
import axios from 'axios';
import { UserMetadata, UserMetadataDocument } from 'src/schemas/userMetadata.schema';
import { Subscrbtion, SubscrbtionDocument } from 'src/schemas/subcribtion.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(UserMetadata.name)
    private readonly userMetadataModel: Model<UserMetadataDocument>,
    @InjectModel(Subscrbtion.name)
    private readonly subscriptionModel: Model<SubscrbtionDocument>,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

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

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    try {
      const lastName = profile.name?.familyName || '';
      const firstName = profile.name?.givenName || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const email = profile.emails?.[0]?.value || '';
      const role = typeof req.query.state === 'string' ? req.query.state : 'user';
      // const phoneNumber = '777777777';

      const userName = `${lastName.toLowerCase()}_${firstName}_${profile.id}`;

      const existingUserByEmail = await this.userModel.findOne({
        email: email
      });

      if (existingUserByEmail) {
        const tokens = await this.generateTokens(existingUserByEmail);

        return {
          message: 'Google login successful',
          user: existingUserByEmail,
          ...tokens,
        };
      }

      const existingUserByUsername = await this.userModel.findOne({
        username: userName
      });

      if (existingUserByUsername) {
        const tokens = await this.generateTokens(existingUserByUsername);

        return {
          message: 'Google login successful',
          user: existingUserByUsername,
          ...tokens,
        };
      }

      const plainPassword = randomBytes(16).toString('hex'); // strong random password
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

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
            customer.email === email
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
              name: fullName,
              email: email,
              // contact: phoneNumber,
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

      const createdUser = await this.userModel.create({
        fullName,
        email,
        username: userName,
        role,
        rozarPayId: razorpayCustomerId,
        password: hashedPassword,
        provideType: 'google',
        providerId: profile.id,
        isActive: true,
        isSubscribed: role === 'user' ? true : false,
        isEmailVerified: true,
        isPhoneNumberVerified: true,
        isEmailNotificationEnabled: true
      });

      if (!createdUser) {
        throw new BadRequestException('Failed to create user');
      }

      const metaObject = await this.userMetadataModel.create({
        userId: createdUser._id.toString(),
        profilePicture: profile.photos?.[0]?.value || '',
      });

      createdUser.usermetaID = metaObject._id.toString();
      await createdUser.save();

      await this.subscriptionModel.create({
        userId: createdUser._id,
        userMetadataId: metaObject._id,
        pgeUserId: razorpayCustomerId
      });

      const tokens = await this.generateTokens(createdUser);
      if (!tokens) {
        throw new Error('Failed to generate token');
      }

      await sendWelcomeMessage(createdUser.email || '', createdUser.fullName || '', createdUser.role || '');

      return {
        message: 'Successfully',
        user: createdUser,
        ...tokens,
      };
    } catch (error: any) {
      throw new BadRequestException(error);
    }
  }
}