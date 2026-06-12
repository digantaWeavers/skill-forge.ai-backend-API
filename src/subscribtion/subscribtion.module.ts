import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { SubscribtionService } from './subscribtion.service';
import { SubscribtionController } from './subscribtion.controller';
import { User, UserSchema } from 'src/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMetadata, UserMetadataSchema } from 'src/schemas/userMetadata.schema';
import { AuthMiddleware } from 'src/common/middleware/auth.middleware';
import { Subscrbtion, SubscrbtionSchema } from 'src/schemas/subcribtion.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';

@Module({
    imports: [
        JwtModule.register({}),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: UserMetadata.name, schema: UserMetadataSchema },
            { name: Subscrbtion.name, schema: SubscrbtionSchema },
            { name: Payment.name, schema: PaymentSchema },
        ]),
    ],
    controllers: [SubscribtionController],
    providers: [SubscribtionService],
    exports: [SubscribtionService],
})
export class SubscribtionModule {
    public configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .exclude(
                { path: 'api/v1/subscription/webhook/razorpay', method: RequestMethod.POST },
            )
            .forRoutes(SubscribtionController);
    }
}
