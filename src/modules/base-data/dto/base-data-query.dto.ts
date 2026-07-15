import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ClassroomStatus } from '../../../../generated/prisma/client';

export class DepartmentQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;
}

export class MajorQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;
}

export class ClassGroupQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}$/, { message: 'code must be exactly 2 digits' })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  majorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  grade?: number;
}

export class CourseQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CourseDetailQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;
}

export class ClassroomQueryDto {
  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsEnum(ClassroomStatus)
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
