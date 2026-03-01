import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveStepDto {
  @ApiPropertyOptional({ example: 'تم التحقق من الوثائق بنجاح.' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class RejectStepDto {
  @ApiProperty({ example: 'المستند غير واضح، يرجى إعادة الرفع.' })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class SubmitStepDto {
  @ApiPropertyOptional({ example: 'some input value' })
  @IsOptional()
  @IsString()
  inputValue?: string;
}