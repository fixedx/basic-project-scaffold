/**
 * 事务装饰器 - 使用 typeorm-transactional 库
 * 
 * 用法:
 * ```typescript
 * @Transactional()
 * async create(dto: CreateDto) {
 *   // 所有数据库操作自动在同一个事务中
 * }
 * ```
 */
export { Transactional } from 'typeorm-transactional';
