import { IsNotEmpty, IsString } from 'class-validator';

export class SendNotificationDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsString()
  type: 'info' | 'warning' | 'error' | 'success';
}
