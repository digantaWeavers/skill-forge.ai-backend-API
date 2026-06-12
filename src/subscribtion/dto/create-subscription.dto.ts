import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionDto {
    @IsString()
    @IsNotEmpty()
    planId!: string;
}


export class CancelSubscriptionDto {
    @IsString()
    @IsNotEmpty()
    subscriptionId!: string;
}