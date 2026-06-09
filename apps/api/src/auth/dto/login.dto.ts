import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Employee ID. */
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
