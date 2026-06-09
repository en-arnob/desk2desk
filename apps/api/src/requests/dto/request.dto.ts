import { IsEnum, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { Priority } from '@desk2desk/shared';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsInt()
  categoryId!: number;

  @IsEnum(Priority)
  priority!: Priority;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class ReassignDto {
  @IsString()
  assigneeId!: string;
}
