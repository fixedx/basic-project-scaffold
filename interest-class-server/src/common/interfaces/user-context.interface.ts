/**
 * 用户上下文接口
 * 存储在请求上下文中的用户信息
 */
export interface UserContext {
  userId?: string;
  username?: string;
  roles?: string[];
  institutionId?: string;
  [key: string]: any;
  [key: symbol]: any;
}
