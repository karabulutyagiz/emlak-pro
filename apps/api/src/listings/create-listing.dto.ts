import { IsArray, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MaxLength(50)
  source!: string;

  @IsString()
  @MaxLength(120)
  sourceListingId!: string;

  @IsString()
  @MaxLength(240)
  title!: string;

  @IsUrl()
  canonicalUrl!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  roomCount?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  grossAreaM2?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  primaryImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];
}
