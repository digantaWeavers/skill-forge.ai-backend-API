import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UserMetadata, UserMetadataDocument } from 'src/schemas/userMetadata.schema';
import { Subscrbtion, SubscrbtionDocument } from 'src/schemas/subcribtion.schema';
import { Payment, PaymentDocument } from 'src/schemas/payment.schema';

@Injectable()
export class SubscribtionService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(UserMetadata.name)
        private readonly userMetadataModel: Model<UserMetadataDocument>,
        @InjectModel(Subscrbtion.name)
        private readonly subscriptionModel: Model<SubscrbtionDocument>,
        @InjectModel(Payment.name)
        private readonly paymentModel: Model<PaymentDocument>,
    ) { }

    verifySignature(body: string, signature: string): boolean {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!secret) {
            throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    }

    async createSubscriptionLinkForInstactorService(userId: string, planId: string) {
        try {
            const user = await this.userModel.findById(userId).exec();
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const createSubscribtionLink = await axios.post<{ id: string, status: string, short_url: string }>(
                'https://api.razorpay.com/v1/subscriptions',
                {
                    plan_id: planId,
                    total_count: 12,
                    notes: {
                        userId: user._id.toString(),
                    },
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

            if (!createSubscribtionLink.data) {
                throw new BadRequestException('Failed to create subscription link');
            }

            const metaObject = await this.userMetadataModel.findOneAndUpdate(
                { userId: user._id.toString() },
                {
                    subcribtionStatus: createSubscribtionLink.data.status,
                },
                { upsert: true, returnDocument: 'after' },
            ).exec();

            if (metaObject) {
                user.usermetaID = metaObject._id.toString();
                await user.save();
            }

            return {
                message: 'Subscription created successfully',
                data: createSubscribtionLink.data.short_url,
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    async handleCancleSubcribtion(subscrbtionId: string) {
        try {
            const subscrbtionDetails = await this.subscriptionModel.findOne(
                { razorpaySubscriptionId: subscrbtionId }
            ).exec();
            if (!subscrbtionDetails) {
                throw new BadRequestException('Subscription not found');
            }

            const reasponse = await axios.post<{ status: string }>(
                `https://api.razorpay.com/v1/subscriptions/${subscrbtionDetails.razorpaySubscriptionId}/cancel`,
                {
                    cancel_at_cycle_end: false
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

            if (reasponse.status !== 200) {
                throw new BadRequestException('Failed to cancel subscription');
            }

            await this.userMetadataModel.findOneAndUpdate(
                { userId: subscrbtionDetails.userId },
                { subcribtionStatus: reasponse.data.status },
            ).exec();

            await this.userModel.findOneAndUpdate(
                { _id: subscrbtionDetails.userId },
                { isSubscribed: false }
            ).exec();

            return {
                status: reasponse.data.status,
                message: 'Subscription cancelled successfully',
            };
        } catch (error) {
            throw new BadRequestException(error);
        }
    }


    /*
    async handleWebhook(rawBody: string, signature: string): Promise<{ received: boolean }> {
        const isValid = this.verifySignature(rawBody, signature);
        if (!isValid) {
            throw new BadRequestException('Invalid webhook signature');
        }

        // ✅ Typed exactly matching your webhook payload structure
        const payload = JSON.parse(rawBody) as {
            event?: string;
            account_id?: string;
            created_at?: number;
            payload?: {
                subscription?: {
                    entity?: {
                        id?: string;
                        plan_id?: string;
                        customer_id?: string;
                        status?: string;
                        current_start?: number;
                        current_end?: number;
                        payment_method?: string;
                        notes?: { userId?: string };
                    };
                };
                payment?: {
                    entity?: {
                        id?: string;
                        amount?: number;
                        currency?: string;
                        status?: string;
                        order_id?: string;
                        invoice_id?: string;
                        token_id?: string;
                        card_id?: string;
                        fee?: number;
                        tax?: number;
                        created_at?: number;
                        card?: object;
                    };
                };
            };
        };

        const event = payload.event ?? 'unknown';
        const subEntity = payload.payload?.subscription?.entity;
        const payEntity = payload.payload?.payment?.entity;

        // ─── Write to file ────────────────────────────────────────────
        const filePath = path.join(process.cwd(), 'src', 'webhook-response.txt');
        try {
            let existing: unknown[] = [];
            if (fs.existsSync(filePath)) {
                try {
                    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    existing = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    existing = [];
                }
            }

            existing.push({ receivedAt: new Date().toISOString(), event, payload });

            const fileContent = existing
                .map((entry, index) => {
                    const e = entry as { receivedAt?: string };
                    const timestamp = e.receivedAt
                        ? new Date(e.receivedAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'full',
                            timeStyle: 'long',
                        })
                        : 'Unknown time';
                    return (
                        `\n${'='.repeat(60)}\n` +
                        `📅 Entry #${index + 1} — ${timestamp}\n` +
                        `${'='.repeat(60)}\n` +
                        JSON.stringify(entry, null, 2)
                    );
                })
                .join('\n') + '\n';

            fs.writeFileSync(filePath, fileContent, 'utf-8');
        } catch (fileError) {
            console.error('❌ Failed to write webhook response file:', fileError);
        }

        // ─── Update DB on subscription.activated ─────────────────────
        if (event === 'subscription.activated' || event === 'subscription.updated') {
            const userId = subEntity?.notes?.userId;
            if (!userId) {
                console.warn('⚠️ No userId in subscription notes');
                return { received: true };
            }

            // 1️⃣ Find UserMetadata to get its _id
            const userMeta = await this.userMetadataModel.findOne({ userId });

            if (!userMeta) {
                console.warn('⚠️ UserMetadata not found for userId:', userId);
                return { received: true };
            }

            // 2️⃣ Upsert Subscrbtion document
            await this.subscriptionModel.findOneAndUpdate(
                { userId },
                {
                    userId,
                    pgeUserId: payload?.account_id ?? 'unknown',
                    userMetadataId: userMeta._id,
                    razorpaySubscriptionId: subEntity?.id,
                    subcribtionStatus: subEntity?.status,
                    planId: subEntity?.plan_id,
                    paymentMethod: subEntity?.payment_method,
                    startDate: subEntity?.current_start
                        ? new Date(subEntity.current_start * 1000)
                        : undefined,
                    endDate: subEntity?.current_end
                        ? new Date(subEntity.current_end * 1000)
                        : undefined,
                    payemntDetails: payEntity ? {
                        razorpayPaymentId: payEntity.id,
                        amount: payEntity.amount?.toString(),
                        taxAmount: payEntity.tax?.toString(),
                        currency: payEntity.currency,
                        status: payEntity.status,
                        order_id: payEntity.order_id,
                        invoice_id: payEntity.invoice_id,
                        token_id: payEntity.token_id,
                        created_at: payEntity.created_at?.toString(),
                        card_id: payEntity.card_id,
                    } : undefined,

                    cardDetails: payEntity?.card ?? undefined,
                },
                { upsert: true, returnDocument: 'after' },
            ).exec();

            // 3️⃣ Update UserMetadata with the new Subscrbtion _id
            const newSub = await this.subscriptionModel
                .findOne({ userId })
                .exec();

            if (newSub) {
                await this.userMetadataModel.findOneAndUpdate(
                    { userId },
                    { subcribtionID: newSub._id },
                ).exec();
            }

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: true },
            ).exec();

            return { received: true };
        }

        // ─── Update DB on subscription.cancelled ─────────────────────
        if (event === 'subscription.cancelled') {
            const userId = subEntity?.notes?.userId;
            if (!userId) {
                console.warn('⚠️ No userId in subscription notes');
                return { received: true };
            }

            // 2️⃣ Upsert Subscrbtion document
            await this.subscriptionModel.findOneAndUpdate(
                { razorpaySubscriptionId: subEntity?.id, userId },
                {
                    subcribtionStatus: subEntity?.status,
                    isCanceled: true,
                    cancelAt: new Date(),
                },
                { upsert: true, returnDocument: 'after' },
            ).exec();

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: false },
            ).exec();

            return { received: true };
        }

        return { received: true };
    }
    */
    async handleWebhook(rawBody: string, signature: string): Promise<{ received: boolean }> {
        const isValid = this.verifySignature(rawBody, signature);
        if (!isValid) {
            throw new BadRequestException('Invalid webhook signature');
        }

        const payload = JSON.parse(rawBody) as {
            event?: string;
            account_id?: string;
            created_at?: number;
            payload?: {
                subscription?: {
                    entity?: {
                        id?: string;
                        plan_id?: string;
                        customer_id?: string;
                        status?: string;
                        current_start?: number;
                        current_end?: number;
                        payment_method?: string;
                        notes?: { userId?: string };
                    };
                };
                payment?: {
                    entity?: {
                        id?: string;
                        amount?: number;
                        currency?: string;
                        status?: string;
                        order_id?: string;
                        invoice_id?: string;
                        token_id?: string;
                        card_id?: string;
                        fee?: number;
                        tax?: number;
                        created_at?: number;
                        method?: string;
                        card?: object;
                    };
                };
            };
        };

        const event = payload.event ?? 'unknown';
        const subEntity = payload.payload?.subscription?.entity;
        const payEntity = payload.payload?.payment?.entity;

        // ─── Write to file ─────────────────────────────────────────
        const filePath = path.join(process.cwd(), 'src', 'webhook-response.txt');
        try {
            let existing: unknown[] = [];
            if (fs.existsSync(filePath)) {
                try {
                    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    existing = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    existing = [];
                }
            }
            existing.push({ receivedAt: new Date().toISOString(), event, payload });
            const fileContent = existing
                .map((entry, index) => {
                    const e = entry as { receivedAt?: string };
                    const timestamp = e.receivedAt
                        ? new Date(e.receivedAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'full',
                            timeStyle: 'long',
                        })
                        : 'Unknown time';
                    return (
                        `\n${'='.repeat(60)}\n` +
                        `📅 Entry #${index + 1} — ${timestamp}\n` +
                        `${'='.repeat(60)}\n` +
                        JSON.stringify(entry, null, 2)
                    );
                })
                .join('\n') + '\n';
            fs.writeFileSync(filePath, fileContent, 'utf-8');
        } catch (fileError) {
            console.error('❌ Failed to write webhook response file:', fileError);
        }

        // ─── Helper: save payment record ───────────────────────────
        const savePayment = async (userId: string) => {
            if (!payEntity?.id) return;

            // Find the subscription document to link it
            const subDoc = await this.subscriptionModel
                .findOne({ razorpaySubscriptionId: subEntity?.id ?? '', userId })
                .exec();

            // Avoid duplicate payment records
            const existingPayment = await this.paymentModel
                .findOne({ razorpayPaymentId: payEntity.id })
                .exec();

            if (existingPayment) return;

            await this.paymentModel.create({
                userId,
                subscriptionId: subDoc?._id,
                razorpayPaymentId: payEntity.id,
                razorpaySubscriptionId: subEntity?.id,
                razorpayInvoiceId: payEntity.invoice_id,
                razorpayOrderId: payEntity.order_id,
                amount: payEntity.amount,
                fee: payEntity.fee,
                tax: payEntity.tax,
                currency: payEntity.currency,
                status: payEntity.status,
                paymentMethod: payEntity.method,
                tokenId: payEntity.token_id,
                cardId: payEntity.card_id,
                cardDetails: payEntity.card,
                paidAt: payEntity.created_at,
            });
        };

        // ─── subscription.activated ────────────────────────────────
        if (event === 'subscription.activated') {
            const userId = subEntity?.notes?.userId;
            if (!userId) return { received: true };

            const userMeta = await this.userMetadataModel.findOne({ userId }).exec();
            if (!userMeta) return { received: true };

            const subDoc = await this.subscriptionModel.findOneAndUpdate(
                { userId },
                {
                    userId,
                    pgeUserId: payload.account_id ?? 'unknown',
                    userMetadataId: userMeta._id,
                    razorpaySubscriptionId: subEntity?.id,
                    subcribtionStatus: subEntity?.status,
                    planId: subEntity?.plan_id,
                    paymentMethod: subEntity?.payment_method,
                    startDate: subEntity?.current_start ? new Date(subEntity.current_start * 1000) : undefined,
                    endDate: subEntity?.current_end ? new Date(subEntity.current_end * 1000) : undefined,
                    payemntDetails: payEntity ? {
                        razorpayPaymentId: payEntity.id,
                        amount: payEntity.amount?.toString(),
                        taxAmount: payEntity.tax?.toString(),
                        currency: payEntity.currency,
                        status: payEntity.status,
                        order_id: payEntity.order_id,
                        invoice_id: payEntity.invoice_id,
                        token_id: payEntity.token_id,
                        created_at: payEntity.created_at?.toString(),
                        card_id: payEntity.card_id,
                    } : undefined,
                    cardDetails: payEntity?.card,
                },
                { upsert: true, returnDocument: 'after' },
            ).exec();

            // Link subscription _id back to UserMetadata
            if (subDoc) {
                await this.userMetadataModel.findOneAndUpdate(
                    { userId },
                    { subcribtionID: subDoc._id, subcribtionStatus: subEntity?.status },
                    { returnDocument: 'after' },
                ).exec();
            }

            // Save first payment
            await savePayment(userId);

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: true },
            ).exec();

            return { received: true };
        }

        // ─── subscription.charged (recurring payment) ──────────────
        // Fires every billing cycle — just save the new payment record
        if (event === 'subscription.charged') {
            const userId = subEntity?.notes?.userId;
            if (!userId) return { received: true };

            // Update subscription dates and status for new cycle
            await this.subscriptionModel.findOneAndUpdate(
                { razorpaySubscriptionId: subEntity?.id, userId },
                {
                    subcribtionStatus: subEntity?.status,
                    startDate: subEntity?.current_start ? new Date(subEntity.current_start * 1000) : undefined,
                    endDate: subEntity?.current_end ? new Date(subEntity.current_end * 1000) : undefined,
                    payemntDetails: payEntity ? {
                        razorpayPaymentId: payEntity.id,
                        amount: payEntity.amount?.toString(),
                        taxAmount: payEntity.tax?.toString(),
                        currency: payEntity.currency,
                        status: payEntity.status,
                        order_id: payEntity.order_id,
                        invoice_id: payEntity.invoice_id,
                        token_id: payEntity.token_id,
                        created_at: payEntity.created_at?.toString(),
                        card_id: payEntity.card_id,
                    } : undefined,
                },
                { returnDocument: 'after' },
            ).exec();

            // ✅ Save each recurring payment as a new Payment document
            await savePayment(userId);

            return { received: true };
        }

        // ─── subscription.halted ───────────────────────────────────
        // Payment failed after retries — mark user as unsubscribed
        if (event === 'subscription.halted') {
            const userId = subEntity?.notes?.userId;
            if (!userId) return { received: true };

            await this.subscriptionModel.findOneAndUpdate(
                { razorpaySubscriptionId: subEntity?.id, userId },
                { subcribtionStatus: 'halted' },
            ).exec();

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: false },
            ).exec();

            return { received: true };
        }

        // ─── subscription.cancelled ────────────────────────────────
        if (event === 'subscription.cancelled') {
            const userId = subEntity?.notes?.userId;
            if (!userId) return { received: true };

            await this.subscriptionModel.findOneAndUpdate(
                { razorpaySubscriptionId: subEntity?.id, userId },
                {
                    subcribtionStatus: subEntity?.status,
                    isCanceled: true,
                    cancelAt: new Date(),
                },
                { returnDocument: 'after' },
            ).exec();

            await this.userMetadataModel.findOneAndUpdate(
                { userId },
                { subcribtionStatus: 'cancelled' },
            ).exec();

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: false },
            ).exec();

            return { received: true };
        }

        // ─── subscription.completed ────────────────────────────────
        if (event === 'subscription.completed') {
            const userId = subEntity?.notes?.userId;
            if (!userId) return { received: true };

            await this.subscriptionModel.findOneAndUpdate(
                { razorpaySubscriptionId: subEntity?.id, userId },
                { subcribtionStatus: 'completed' },
            ).exec();

            await this.userModel.findOneAndUpdate(
                { _id: userId },
                { isSubscribed: false },
            ).exec();

            return { received: true };
        }

        return { received: true };
    }
}
