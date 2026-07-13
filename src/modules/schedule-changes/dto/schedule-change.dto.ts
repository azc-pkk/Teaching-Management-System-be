import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkflowStatus } from '../../../../generated/prisma/client';

export class QueryScheduleChangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classGroupId?: number;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateScheduleChangeDto {
  @Type(() => Number)
  @IsInt()
  teacherId!: number;

  @Type(() => Number)
  @IsInt()
  courseId!: number;

  @Type(() => Number)
  @IsInt()
  classGroupId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  hours!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class UpdateScheduleChangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classGroupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  hours?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class UpdateScheduleChangeStatusDto {
  @IsEnum(WorkflowStatus)
  status!: WorkflowStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  operatorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
