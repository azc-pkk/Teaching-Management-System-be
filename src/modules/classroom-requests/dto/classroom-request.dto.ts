import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkflowStatus } from '../../../../generated/prisma/client';

export class QueryClassroomRequestDto {
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
  applicantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classroomId?: number;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsDateString()
  startTimeFrom?: string;

  @IsOptional()
  @IsDateString()
  startTimeTo?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateClassroomRequestDto {
  @Type(() => Number)
  @IsInt()
  applicantId!: number;

  @Type(() => Number)
  @IsInt()
  classroomId!: number;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  purpose!: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class UpdateClassroomRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  applicantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classroomId?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  purpose?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class UpdateClassroomRequestStatusDto {
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
