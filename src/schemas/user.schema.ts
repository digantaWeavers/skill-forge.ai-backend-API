import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    fullName!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true, unique: true })
    username!: string;

    @Prop({ unique: true })
    phoneNumber?: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ enum: ['user', 'instructor'], default: 'user' })
    role?: string;

    @Prop()
    usermetaID?: string;

    @Prop({ default: false })
    isActive!: boolean;

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