import { IsString, MinLength } from 'class-validator';

export class RegisterStudentDto {
  @IsString()
  studentNo!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
