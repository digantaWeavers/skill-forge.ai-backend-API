import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OTPDocument = HydratedDocument<OTP>;

@Schema({ timestamps: true })
export class OTP {
    @Prop({ required: true, enum: ['email_verification', 'phone_verification'] })
    type!: string; // e.g., 'email_verification', 'password_reset'

    @Prop()
    otpVerificationFor?: string; // e.g., email or phone number

    @Prop({ required: true })
    otp!: string;

    @Prop({ default: Date.now, expires: 300 }) // OTP expires after 5 minutes
    createdAt?: Date;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);