import { BadRequestException, Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
// import * as NestCommon from '@nestjs/common';
import { SubscribtionService } from './subscribtion.service';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request';
import { CancelSubscriptionDto, CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('')
export class SubscribtionController {
    constructor(private subcribtionService: SubscribtionService) { }

    @Post('create-subscription-link')
    async createSubscriptionLink(
        @Req() req: AuthenticatedRequest,
        @Body() body: CreateSubscriptionDto,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not authenticated');
        return await this.subcribtionService.createSubscriptionLinkForInstactorService(
            userId,
            body.planId,
        );
    }

    @Post('cancel')
    async cancelSubscription(
        // @Req() req: AuthenticatedRequest,
        @Body() body: CancelSubscriptionDto,
    ) {
        // const userId = req.user?.id;
        // if (!userId) throw new BadRequestException('User not authenticated');
        return await this.subcribtionService.handleCancleSubcribtion(
            body.subscriptionId,
        );
    }

    @Post('webhook/razorpay')
    async razorpayWebhook(
        @Req() req: Request & { rawBody?: Buffer },
        @Headers('x-razorpay-signature') signature: string,
    ) {
        const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf-8');
        if (!rawBody) throw new BadRequestException('Missing raw body');

        return await this.subcribtionService.handleWebhook(rawBody, signature);
    }
}