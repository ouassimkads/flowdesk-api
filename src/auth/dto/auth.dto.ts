import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'أمارا أوسي' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '#C084FC' })
  @IsOptional()
  @IsString()
  avatarColor?: string;

  @IsNumber()
  phoneNumber: number;

  @IsString()
  personalAdress: string;
  
  @IsString()
  workAdress: string;

  @IsString()
  academicLevel: string;
}

export class LoginDto {
  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
