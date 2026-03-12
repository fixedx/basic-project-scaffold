import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * 审核签约 DTO
 */
export class ReviewContractDto {
  /**
   * 审核结果: approved(通过), rejected(驳回)
   */
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  /**
   * 驳回原因（驳回时必填）
   */
  @IsString()
  @IsOptional()
  rejectReason?: string;
}
