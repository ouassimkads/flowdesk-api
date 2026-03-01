import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
export enum WorkflowStepType {
  INPUT = 'input',
  DOCUMENT = 'document',
  BUTTON = 'button',
}
export class CreateWorkflowStepDto {
  @ApiProperty({ example: 'المعلومات الشخصية' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'ارفع الهوية الوطنية أو جواز السفر' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: '👤' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  position: number;

  @ApiProperty({ example: WorkflowStepType.INPUT, enum: WorkflowStepType })
  @IsEnum(WorkflowStepType)
  @IsOptional()
  type?: WorkflowStepType = WorkflowStepType.INPUT;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresDocuments?: boolean = false;
}

export class UpdateWorkflowStepDto extends PartialType(CreateWorkflowStepDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderStepsDto {
  @ApiProperty({ example: [{ id: 'cuid1', position: 1 }, { id: 'cuid2', position: 2 }] })
  steps: { id: string; position: number }[];
}
