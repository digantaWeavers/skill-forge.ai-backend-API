import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { StringValue } from 'ms';
import { Strategy, Profile } from 'passport-github2';
import { Request } from 'express';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { sendWelcomeMessage } from 'src/common/middleware/email.middleware';
import axios from 'axios';
import { UserMetadata, UserMetadataDocument } from 'src/schemas/userMetadata.schema';
import { Subscrbtion, SubscrbtionDocument } from 'src/schemas/subcribtion.schema';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
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
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/api/v1/auth/github/callback',
      scope: ['user:email'],
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
      const role = typeof req.query.state === 'string' ? req.query.state : 'user';

      const email = profile.emails?.[0]?.value || '';

      if (!email) {
        throw new BadRequestException(
          'GitHub email not available. Please make your GitHub email public.',
        );
      }

      const githubUsername = profile.username || 'githubuser';

      const fullName = profile.displayName || githubUsername;

      const userName = `${githubUsername}_${profile.id}`;
      // const phoneNumber = '777777777';

      // CHECK EXISTING USER
      const existingUser = await this.userModel.findOne({
        $or: [
          { email },
          {
            providerId: profile.id,
            provideType: 'github',
          },
        ],
      });

      // LOGIN EXISTING USER
      if (existingUser) {
        const tokens = await this.generateTokens(existingUser);

        return {
          message: 'GitHub login successful',
          user: existingUser,
          ...tokens,
        };
      }

      // RANDOM PASSWORD
      const plainPassword = randomBytes(16).toString('hex');

      const hashedPassword = await bcrypt.hash(
        plainPassword,
        10,
      );

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
        // CREATE CUSTOMER

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

      // CREATE NEW USER
      const createdUser = await this.userModel.create({
        fullName,
        email,
        username: userName,
        role,
        rozarPayId: razorpayCustomerId,
        password: hashedPassword,
        provideType: 'github',
        providerId: profile.id,
        isActive: true,
        isSubscribed: role === 'user' ? true : false,
        isEmailVerified: true,
        isPhoneNumberVerified: false,
        isEmailNotificationEnabled: true,
      });

      if (!createdUser) {
        throw new BadRequestException(
          'Failed to create user',
        );
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

      // GENERATE TOKENS
      const tokens = await this.generateTokens(createdUser);
      if (!tokens) {
        throw new Error('Failed to generate token');
      }

      await sendWelcomeMessage(createdUser.email || '', createdUser.fullName || '', createdUser.role || '');

      return {
        message: 'GitHub signup successful',
        user: createdUser,
        ...tokens,
      };
    } catch (error: any) {
      throw new BadRequestException(error);
    }
  }
}