import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type SubscrbtionDocument = HydratedDocument<Subscrbtion>;

@Schema({ timestamps: true })
export class Subscrbtion {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId!: mongoose.Types.ObjectId | string;

    @Prop({ type: String, required: true })
    pgeUserId!: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserMetadata',
        required: true,
    })
    userMetadataId!: mongoose.Types.ObjectId | string;

    @Prop({ type: String })
    razorpaySubscriptionId?: string;

    @Prop({ type: String })
    subcribtionStatus?: string;

    @Prop({ type: String })
    planId?: string;

    @Prop({ type: Date })
    startDate?: Date;

    @Prop({ type: Date })
    endDate?: Date;

    @Prop({ default: false })
    isCanceled?: boolean;

    @Prop({ type: Date })
    cancelAt?: Date;

    @Prop({ type: String })
    paymentMethod?: string;

    // ✅ Explicit nested object schema — fixes CannotDetermineTypeError
    @Prop({
        type: {
            razorpayPaymentId: { type: String },
            amount: { type: String },
            taxAmount: { type: String },
            currency: { type: String },
            status: { type: String },
            order_id: { type: String },
            invoice_id: { type: String },
            token_id: { type: String },
            created_at: { type: String },
            card_id: { type: String },
        },
        _id: false,
        default: undefined,
    })
    payemntDetails?: {
        razorpayPaymentId?: string;
        amount?: string;
        taxAmount?: string;
        currency?: string;
        status?: string;
        order_id?: string;
        invoice_id?: string;
        token_id?: string;
        created_at?: string;
        card_id?: string;
    };

    // ✅ Mixed for free-form object
    @Prop({ type: mongoose.Schema.Types.Mixed, default: undefined })
    cardDetails?: object;
}

export const SubscrbtionSchema = SchemaFactory.createForClass(Subscrbtion);