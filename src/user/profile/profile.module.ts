import { MiddlewareConsumer, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscrbtion, SubscrbtionSchema } from 'src/schemas/subcribtion.schema';
import { UserMetadata, UserMetadataSchema } from 'src/schemas/userMetadata.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { AuthMiddleware } from 'src/common/middleware/auth.middleware';

@Module({
    imports: [
        JwtModule.register({}),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: UserMetadata.name, schema: UserMetadataSchema },
            { name: Subscrbtion.name, schema: SubscrbtionSchema },
        ]),
    ],
    controllers: [ProfileController],
    providers: [ProfileService],
    exports: [ProfileService],
})
export class ProfileModule {
    public configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(ProfileController);
    }
}
