import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { UserContext } from '../interfaces/user-context.interface';

/**
 * 用户上下文服务
 * 用于在应用的任何地方获取当前登录用户的信息
 */
@Injectable()
export class UserContextService {
  constructor(private readonly clsService: ClsService<UserContext>) {}

  /**
   * 获取当前登录用户ID
   * @throws Error 如果没有用户上下文（未认证）
   */
  getCurrentUserId(): string {
    const userId = this.clsService.get('userId');
    if (!userId) {
      throw new Error('No user context found. User must be authenticated.');
    }
    return userId;
  }

  /**
   * 尝试获取当前用户ID（不抛出异常）
   * @returns 用户ID或undefined
   */
  getCurrentUserIdOrNull(): string | undefined {
    return this.clsService.get('userId');
  }

  /**
   * 获取当前用户上下文
   */
  getCurrentUser(): UserContext {
    const user = this.clsService.get();
    if (!user || !user.userId) {
      throw new Error('No user context found. User must be authenticated.');
    }
    return user;
  }

  /**
   * 尝试获取当前用户上下文（不抛出异常）
   */
  getCurrentUserOrNull(): UserContext | undefined {
    return this.clsService.get();
  }

  /**
   * 获取当前用户名
   */
  getCurrentUsername(): string | undefined {
    return this.clsService.get('username');
  }

  /**
   * 获取当前用户角色
   */
  getCurrentUserRoles(): string[] | undefined {
    return this.clsService.get('roles');
  }

  /**
   * 检查当前用户是否有指定角色
   */
  hasRole(role: string): boolean {
    const roles = this.getCurrentUserRoles();
    return roles ? roles.includes(role) : false;
  }

  /**
   * 检查当前用户是否有任一指定角色
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getCurrentUserRoles();
    if (!userRoles) return false;
    return roles.some((role) => userRoles.includes(role));
  }

  /**
   * 检查当前用户是否有所有指定角色
   */
  hasAllRoles(roles: string[]): boolean {
    const userRoles = this.getCurrentUserRoles();
    if (!userRoles) return false;
    return roles.every((role) => userRoles.includes(role));
  }

  /**
   * 设置用户上下文的自定义数据
   */
  set<K extends keyof UserContext>(key: K, value: UserContext[K]): void {
    this.clsService.set(key as string, value);
  }

  /**
   * 获取用户上下文的自定义数据
   */
  get<K extends keyof UserContext>(key: K): UserContext[K] | undefined {
    // ClsService.get 返回 any，我们需要进行类型转换

    const value = this.clsService.get(key as string);
    if (value === null || value === undefined) {
      return undefined;
    }

    return value as UserContext[K];
  }

  /**
   * 获取当前用户所属的机构ID
   * @returns 机构ID或undefined
   */
  getInstitutionId(): string | undefined {
    return this.clsService.get('institutionId');
  }

  /**
   * 获取当前用户所属的机构ID（必须存在）
   * @throws Error 如果没有机构ID
   */
  getInstitutionIdOrThrow(): string {
    const institutionId = this.getInstitutionId();
    if (!institutionId) {
      throw new Error(
        'No institution context found. User must be associated with an institution.',
      );
    }
    return institutionId;
  }
}
