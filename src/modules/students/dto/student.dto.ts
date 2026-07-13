import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { StudentStatus } from '../../../../generated/prisma/client';

export class QueryStudentDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classGroupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  grade?: number;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}

export class CreateStudentDto {
  @IsString()
  studentNo!: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classGroupId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  grade!: number;

  @IsEnum(StudentStatus)
  status!: StudentStatus;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  studentNo?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classGroupId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  grade?: number;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  phone?: string;
}
