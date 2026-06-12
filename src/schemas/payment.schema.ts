import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId!: mongoose.Types.ObjectId | string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscrbtion',
        required: true,
    })
    subscriptionId!: mongoose.Types.ObjectId | string;

    @Prop({ type: String, required: true })
    razorpayPaymentId!: string;       // pay_xxx

    @Prop({ type: String })
    razorpaySubscriptionId?: string;  // sub_xxx

    @Prop({ type: String })
    razorpayInvoiceId?: string;       // inv_xxx

    @Prop({ type: String })
    razorpayOrderId?: string;         // order_xxx

    @Prop({ type: Number })
    amount?: number;                  // in paise

    @Prop({ type: Number })
    fee?: number;

    @Prop({ type: Number })
    tax?: number;

    @Prop({ type: String })
    currency?: string;

    @Prop({ type: String })
    status?: string;                  // captured, failed, refunded

    @Prop({ type: String })
    paymentMethod?: string;           // card, upi, netbanking

    @Prop({ type: String })
    tokenId?: string;

    @Prop({ type: String })
    cardId?: string;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    cardDetails?: object;

    @Prop({ type: Number })
    paidAt?: number;                  // unix timestamp from Razorpay
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);