import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    fullName!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true, unique: true })
    username!: string;

    @Prop()
    phoneNumber?: string;

    @Prop()
    rozarPayId?: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ enum: ['user', 'instructor'], default: 'user' })
    role?: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserMetadata'
    })
    usermetaID?: mongoose.Schema.Types.ObjectId | string;

    @Prop()
    provideType?: string;

    @Prop()
    providerId?: string;

    @Prop({ default: false })
    isActive!: boolean;

    @Prop({ default: false })
    isSubscribed!: boolean;

    @Prop({ default: false })
    isEmailVerified?: boolean;

    @Prop({ default: false })
    isPhoneNumberVerified?: boolean;

    @Prop({ default: true })
    isEmailNotificationEnabled?: boolean;

    @Prop()
    lastLogin?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);