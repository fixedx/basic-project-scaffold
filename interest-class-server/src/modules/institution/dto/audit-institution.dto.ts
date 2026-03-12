import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * 审核机构 DTO
 */
export class AuditInstitutionDto {
  /**
   * 审核状态: approved, rejected
   */
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  auditStatus: 'approved' | 'rejected';

  /**
   * 驳回原因（驳回时必填）
   */
  @IsString()
  @IsOptional()
  rejectReason?: string;
}
