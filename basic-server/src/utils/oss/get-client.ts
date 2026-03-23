/**
 * 获取当前激活的 OSS 客户端实例
 *
 * @example
 * ```typescript
 * import { get_oss_client } from '@/utils/oss/get-client';
 *
 * const oss = get_oss_client();
 * const result = await oss.upload({
 *   filePath: 'test.jpg',
 *   fileContent: buffer,
 * });
 * ```
 */
import { OssFactory } from './index';
import { IOssService } from './oss.interface';

export function get_oss_client(): IOssService {
  return OssFactory.getActiveClient();
}
