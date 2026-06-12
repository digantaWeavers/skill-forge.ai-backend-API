// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import mongoose, { HydratedDocument } from 'mongoose';

// export type UserMetadataDocument = HydratedDocument<UserMetadata>;

// @Schema({ timestamps: true })
// export class UserMetadata {
//     @Prop({
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     })
//     userId!: mongoose.Schema.Types.ObjectId;

//     @Prop()
//     profilePicture?: string;

//     @Prop({
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Subscrbtion'
//     })
//     subcribtionID?: mongoose.Schema.Types.ObjectId;

//     @Prop()
//     subcribtionStatus?: string;

//     @Prop()
//     address?: string;

//     @Prop()
//     socialLinks?: [
//         {
//             platform: string;
//             url: string;
//         }
//     ];
// }

// export const UserMetadataSchema = SchemaFactory.createForClass(UserMetadata);


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserMetadataDocument = HydratedDocument<UserMetadata>;

@Schema({ timestamps: true })
export class UserMetadata {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,  // ✅ Mongoose schema type stays ObjectId
        ref: 'User',
        required: true,
    })
    userId!: mongoose.Types.ObjectId | string;  // ✅ TS type accepts both

    @Prop()
    profilePicture?: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscrbtion',
    })
    subcribtionID?: mongoose.Types.ObjectId | string;  // ✅ same fix

    @Prop({ type: String })
    subcribtionStatus?: string;

    @Prop({ type: String })
    address?: string;

    @Prop({
        type: [
            {
                platform: { type: String },
                url: { type: String },
            }
        ],
        default: [],
    })
    socialLinks?: {
        platform: string;
        url: string;
    }[];
}

export const UserMetadataSchema = SchemaFactory.createForClass(UserMetadata);