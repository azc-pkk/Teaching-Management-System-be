import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { StudentStatus } from '../../../../generated/prisma/client';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

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
  @IsString()
  @Matches(/^\d{2}$/, { message: 'classGroupCode must be exactly 2 digits' })
  classGroupCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  grade?: number;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

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
  @Transform(toBoolean)
  @IsBoolean()
  activated?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  enabled?: boolean;
}

export class CreateStudentDto {
  @IsString()
  @Matches(/^\d{12}$/, { message: 'studentNo must be exactly 12 digits' })
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
  @Matches(/^\d{12}$/, { message: 'studentNo must be exactly 12 digits' })
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
