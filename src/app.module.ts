import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './auth/admin/admin.module';
import { SubscribtionModule } from './subscribtion/subscribtion.module';
import { ProfileModule } from './user/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_CONNECTION_URL'),
      }),
    }),
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          { path: 'auth', module: AuthModule },
          { path: 'subscription', module: SubscribtionModule },
          { path: 'admin/auth', module: AdminModule },
          { path: 'profile', module: ProfileModule },
        ],
      },
    ]),
    AuthModule,
    AdminModule,
    SubscribtionModule,
    ProfileModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
