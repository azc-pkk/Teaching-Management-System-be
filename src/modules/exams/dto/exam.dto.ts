import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryExamDto {
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
  semesterId?: number;

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
  @IsInt()
  classroomId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invigilatorId?: number;

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

export class CreateExamDto {
  @Type(() => Number)
  @IsInt()
  semesterId!: number;

  @Type(() => Number)
  @IsInt()
  courseId!: number;

  @Type(() => Number)
  @IsInt()
  classGroupId!: number;

  @Type(() => Number)
  @IsInt()
  classroomId!: number;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invigilatorId?: number | null;
}

export class UpdateExamDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterId?: number;

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
  @IsInt()
  classroomId?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  invigilatorId?: number | null;
}
