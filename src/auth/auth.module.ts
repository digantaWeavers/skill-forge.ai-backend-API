import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserSchema } from 'src/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { OTPSchema } from 'src/schemas/otp.schema';
import { GoogleStrategy } from "src/auth/strategies/google.strategy";
import { GithubStrategy } from "src/auth/strategies/github.strategy";
import { AdminModule } from './admin/admin.module';
import { UserMetadataSchema } from 'src/schemas/userMetadata.schema';
import { SubscrbtionSchema } from 'src/schemas/subcribtion.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'OTP', schema: OTPSchema },
      { name: 'UserMetadata', schema: UserMetadataSchema },
      { name: 'Subscrbtion', schema: SubscrbtionSchema },
    ]),
    AdminModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    GithubStrategy
  ],
  exports: [AuthService],
})
export class AuthModule { }
