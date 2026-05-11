import { ListingWorkflowStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateListingStateDto {
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsEnum(ListingWorkflowStatus)
  status?: ListingWorkflowStatus;
}
