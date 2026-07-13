import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ClassroomStatus } from '../../../../generated/prisma/client';

export class QueryClassroomDto {
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
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(ClassroomStatus)
  status?: ClassroomStatus;
}

export class CreateClassroomDto {
  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsString()
  roomNo!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  area?: number;

  @IsOptional()
  @IsEnum(ClassroomStatus)
  status?: ClassroomStatus;
}

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  roomNo?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  area?: number;

  @IsOptional()
  @IsEnum(ClassroomStatus)
  status?: ClassroomStatus;
}
