import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username may only contain letters, numbers, ".", "_" and "-"',
  })
  username!: string;

  /** bcrypt only uses the first 72 bytes, so cap input length. */
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  lastName?: string;
}

export class LoginDto {
  /** Email address or username. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}
