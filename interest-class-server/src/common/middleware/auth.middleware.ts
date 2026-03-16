import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { UserContext } from '@/common/interfaces/user-context.interface';

/**
 * 鉴权白名单配置（正则表达式）
 * 使用正则表达式匹配路径，自动处理末尾斜杠问题
 * 注意：这里的路径包含全局前缀 /api
 * 
 * 业务逻辑说明：
 * - 用户浏览阶段（首页、列表、详情、评价）：不需要登录
 * - 用户下单预约阶段：需要登录
 */
/**
 * 白名单配置：{ pattern: 正则表达式, methods?: 允许的HTTP方法列表 }
 * - 如果不指定 methods，则所有 HTTP 方法都放行
 * - 如果指定 methods，只有匹配的方法才放行
 */
const AUTH_WHITELIST_RULES: Array<{ pattern: RegExp; methods?: string[] }> = [
  // ==================== 认证相关 ====================
  { pattern: /^\/api\/auth\/wechat-login\/?$/ },      // 微信登录
  { pattern: /^\/api\/auth\/register\/?$/ },          // 注册
  { pattern: /^\/api\/auth\/admin-login\/?$/ },       // 管理员登录
  { pattern: /^\/api\/auth\/institution-login\/?$/ }, // 机构登录（旧版）
  { pattern: /^\/api\/auth\/phone-login\/?$/ },       // 手机号登录（新版）
  { pattern: /^\/api\/auth\/parent-phone-login\/?$/ }, // 家长手机号登录
  
  // ==================== 枚举管理 ====================
  { pattern: /^\/api\/enums(\/.*)?\/?$/ },            // 枚举相关（所有子路径：查询、初始化、指定类型等）
  
  // ==================== 机构相关（公开接口） ====================
  { pattern: /^\/api\/institution\/?$/ },             // 机构入驻（POST）、机构列表（GET）
  { pattern: /^\/api\/institution\/list\/?$/, methods: ['GET'] },  // 机构列表（公开）
  { pattern: /^\/api\/institution\/nearby\/?$/, methods: ['GET'] }, // 附近机构（公开）
  { pattern: /^\/api\/institution\/search\/area\/?$/, methods: ['GET'] }, // 区域搜索（公开）
  // ⚠️ 机构详情：只匹配纯数字ID（雪花ID），排除 current, my, stats 等需要认证的路由
  { pattern: /^\/api\/institution\/\d+\/?$/, methods: ['GET'] }, // 机构详情（仅数字ID）
  { pattern: /^\/api\/institution\/submit\/?$/ },     // 提交审核
  
  // ==================== 浏览类接口（不需要登录） ====================
  { pattern: /^\/api\/home(\/.*)?\/?$/ },             // 首页相关（所有子路径）
  { pattern: /^\/api\/banner(\/.*)?\/?$/, methods: ['GET'] }, // 轮播图（仅 GET，管理操作需管理员权限）
  { pattern: /^\/api\/courses\/?$/, methods: ['GET'] },          // 课程列表（仅 GET）
  { pattern: /^\/api\/courses\/\d+\/?$/, methods: ['GET'] }, // 课程详情（仅数字ID，仅 GET）
  { pattern: /^\/api\/review\/course\/\d+\/?$/, methods: ['GET'] },       // 课程评价列表（仅 GET）
  { pattern: /^\/api\/review\/institution\/\d+\/?$/, methods: ['GET'] },  // 机构评价列表（仅 GET）
  { pattern: /^\/api\/review\/course\/\d+\/average-rating\/?$/, methods: ['GET'] }, // 课程平均评分（仅 GET）
  { pattern: /^\/api\/review\/course\/\d+\/average\/?$/, methods: ['GET'] }, // 课程平均评分（兼容路由）
  { pattern: /^\/api\/review\/\d+\/?$/, methods: ['GET'] }, // 评价详情（仅 GET）
  { pattern: /^\/api\/categories(\/.*)?\/?$/ },       // 分类列表
  { pattern: /^\/api\/teacher\/\d+\/?$/, methods: ['GET'] }, // 教师详情（仅数字ID，仅 GET）
  { pattern: /^\/api\/teacher\/?$/, methods: ['GET'] }, // 教师列表（仅 GET）
  { pattern: /^\/api\/schedule\/course\/\d+\/?$/, methods: ['GET'] }, // 课程排课列表（仅 GET）
  { pattern: /^\/api\/oss\/preview-url\/?$/, methods: ['GET'] }, // OSS图片预览URL（浏览类接口需要显示图片）
  { pattern: /^\/api\/oss\/upload\/?$/ },                    // OSS文件上传（机构入驻时未登录也需要上传）
  
  // ==================== 支付相关 ====================
  { pattern: /^\/api\/payment\/notify\/?$/ },         // 微信支付回调（必须公开）
  { pattern: /^\/api\/payment\/refund-notify\/?$/ },   // 微信退款回调（必须公开）
  { pattern: /^\/api\/payment\/transfer-notify\/?$/ }, // 微信转账回调（必须公开）
  { pattern: /^\/api\/payment\/status\/\d+\/?$/, methods: ['GET'] }, // 查询支付状态（公开接口）
  
  // ==================== 邀友让利相关 ====================
  // ⚠️ available / validate / calculate-discount 都需要登录（下单时用户已登录），
  // 否则中间件跳过 JWT 解析后，无法识别 currentUserId，自我邀请过滤会失效
  
  // ==================== 公告相关（公开接口） ====================
  { pattern: /^\/api\/announcement\/?$/, methods: ['GET'] },         // 获取公告列表（公开浏览）
  { pattern: /^\/api\/announcement\/active\/?$/, methods: ['GET'] }, // 获取生效中的公告（首页展示）
  { pattern: /^\/api\/announcement\/\d+\/?$/, methods: ['GET'] },    // 获取公告详情（公开浏览）
];

/**
 * JWT Token Payload 接口
 */
interface JwtPayload {
  userId?: string;
  sub?: string;
  id?: string;
  username?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
  nbf?: number;
  [key: string]: unknown;
}

// 扩展 Request 类型以包含 user 属性
declare module 'express' {
  interface Request {
    user?: {
      userId?: string;
      sub?: string;
      id?: string;
      username?: string;
      roles?: string[];
      [key: string]: unknown;
    };
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private clsService: ClsService<UserContext>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 获取完整请求路径和方法
      const requestPath = req.baseUrl + req.path;
      const requestMethod = req.method.toUpperCase();
      
      // Debug log (开发环境)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AuthMiddleware] ${requestMethod} ${requestPath}`);
      }
      
      // 检查是否匹配白名单规则
      const isWhitelisted = AUTH_WHITELIST_RULES.some(rule => {
        // 先检查路径是否匹配
        if (!rule.pattern.test(requestPath)) {
          return false;
        }
        // 如果指定了方法限制，检查方法是否匹配
        if (rule.methods && rule.methods.length > 0) {
          return rule.methods.includes(requestMethod);
        }
        // 未指定方法限制，所有方法都放行
        return true;
      });
      
      if (isWhitelisted) {
        return next();
      }

      // 不在白名单中，需要验证 token
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('未提供认证令牌');
      }

      // 验证 Bearer token 格式
      const [bearer, token] = authHeader.split(' ');

      if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedException('认证令牌格式错误');
      }

      // 验证并解析 token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      // 将解析出的用户信息挂载到 request 对象上
      req.user = payload;

      // 将用户信息存储到 CLS 上下文中
      this.clsService.set(
        'userId',
        payload.userId || payload.sub || payload.id,
      );
      this.clsService.set('username', payload.username);
      this.clsService.set('roles', payload.roles);

      // 可以存储整个 payload
      Object.keys(payload).forEach((key) => {
        if (!['iat', 'exp', 'nbf'].includes(key)) {
          const value = payload[key];
          this.clsService.set(key, value);
        }
      });

      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('认证令牌已过期');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('无效的认证令牌');
        }
      }
      throw error;
    }
  }
}
