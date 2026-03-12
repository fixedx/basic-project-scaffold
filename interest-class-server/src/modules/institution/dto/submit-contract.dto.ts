import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 提交签约凭证 DTO
 */
export class SubmitContractDto {
  /**
   * 签约凭证截图URL
   */
  @IsString({ message: '签约凭证截图必须是字符串' })
  @IsNotEmpty({ message: '签约凭证截图不能为空' })
  contract_screenshot: string;
}
