import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminUserDocument = HydratedDocument<AdminUser>;

@Schema({ timestamps: true })
export class AdminUser {
    @Prop({ required: true })
    fullName!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true, unique: true })
    username!: string;

    @Prop({ required: true })
    password!: string;

    @Prop()
    lastLogin?: Date;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);