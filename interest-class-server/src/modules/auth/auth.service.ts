import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserRepository } from './repositories/user.repository';
import { WechatLoginDto, LoginResponseDto } from './dto/wechat-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { InstitutionLoginDto } from './dto/institution-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { UserInstitutionRepository } from './repositories/user-institution.repository';
import { InstitutionService } from '@/modules/institution/institution.service';
import { verifyPassword } from '@/utils/crypto.util';
import { TeacherUserRepository } from '@/modules/teacher/repositories/teacher-user.repository';

/**
 * 微信登录响应接口
 */
interface WechatCodeToSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private userInstitutionRepository: UserInstitutionRepository,
    private institutionService: InstitutionService,
    private teacherUserRepository: TeacherUserRepository,
  ) {}

  /**
   * 微信小程序登录
   * @param wechatLoginDto 登录参数
   * @returns 登录结果（token 和用户信息）
   */
  @Transactional()
  async wechatLogin(wechatLoginDto: WechatLoginDto): Promise<LoginResponseDto> {
    console.log('AuthService 收到登录参数:', wechatLoginDto);

    if (!wechatLoginDto) {
      throw new UnauthorizedException('登录参数不能为空');
    }

    const { code, nickname, avatar, gender, country, province, city } =
      wechatLoginDto;

    if (!code) {
      throw new UnauthorizedException('微信授权码 code 不能为空');
    }

    // 1. 调用微信接口获取 openid 和 session_key
    const wechatData = await this.getWechatOpenid(code);

    if (!wechatData.openid) {
      throw new UnauthorizedException('微信登录失败，请重试');
    }

    // 2. 查找或创建用户
    let user = await this.userRepository.findByOpenid(wechatData.openid);

    if (!user) {
      // 首次登录，创建新用户
      user = this.userRepository.create({
        openid: wechatData.openid,
        unionid: wechatData.unionid,
        sessionKey: wechatData.session_key,
        nickname: nickname || '微信用户',
        avatar,
        gender,
        country,
        province,
        city,
        lastLoginAt: new Date(),
      });
      const savedUser = await this.userRepository.save(user);
      user = savedUser;
    } else {
      // 更新用户信息
      await this.userRepository.update(user.id, {
        sessionKey: wechatData.session_key,
        unionid: wechatData.unionid,
        nickname: nickname || user.nickname,
        avatar: avatar || user.avatar,
        gender: gender || user.gender,
        country: country || user.country,
        province: province || user.province,
        city: city || user.city,
        lastLoginAt: new Date(),
      });

      // 重新查询获取最新数据
      const updatedUser = await this.userRepository.findOneById(user.id);
      if (!updatedUser) {
        throw new UnauthorizedException('用户信息更新失败');
      }
      user = updatedUser;
    }

    // 3. 生成 JWT token
    const token = this.generateToken(user);

    // 4. 返回登录结果
    return {
      token,
      userInfo: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 调用微信接口获取 openid
   */
  private async getWechatOpenid(
    code: string,
  ): Promise<WechatCodeToSessionResponse> {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('微信小程序配置缺失，请检查环境变量');
    }

    // 开发环境：兼容微信开发者工具的模拟数据
    if (
      process.env.NODE_ENV === 'development' &&
      code === 'the code is a mock one'
    ) {
      console.log('检测到微信开发者工具模拟 code，返回测试数据');
      return {
        openid: 'mock_openid_' + Date.now(),
        session_key: 'mock_session_key',
      };
    }

    console.log('微信登录参数:', {
      appId,
      code,
      appSecretLength: appSecret.length,
    });

    const url = 'https://api.weixin.qq.com/sns/jscode2session';

    try {
      const response = await axios.get<WechatCodeToSessionResponse>(url, {
        params: {
          appid: appId,
          secret: appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      });

      const data = response.data;

      console.log('微信接口返回:', data);

      if (data.errcode) {
        throw new UnauthorizedException(
          `微信登录失败: ${data.errmsg || '未知错误'}`,
        );
      }

      return data;
    } catch (err: unknown) {
      // 如果是我们自己抛出的异常，直接抛出
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      // 其他情况统一返回服务异常
      console.error('微信服务异常:', err);
      throw new UnauthorizedException('微信服务异常，请稍后重试');
    }
  }

  /**
   * 生成 JWT token
   */
  private generateToken(user: UserEntity): string {
    const payload = {
      userId: user.id,
      openid: user.openid,
      username: user.nickname,
      roles: ['user'], // 可根据需求扩展角色系统
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 管理员登录（用户名密码）
   */
  @Transactional()
  async adminLogin(adminLoginDto: AdminLoginDto): Promise<LoginResponseDto> {
    const { username, password } = adminLoginDto;

    // 这里可以从数据库查询管理员账号，这里先用硬编码方式
    // TODO: 后续可以添加管理员表
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 查找或创建管理员用户
    let adminUser = await this.userRepository.findByNickname(username);

    if (!adminUser) {
      // 创建管理员用户
      adminUser = this.userRepository.create({
        openid: `admin_${username}`,
        nickname: username,
        avatar: '',
        lastLoginAt: new Date(),
      });
      const savedUser = await this.userRepository.save(adminUser);
      adminUser = savedUser;
    } else {
      // 更新最后登录时间
      await this.userRepository.update(adminUser.id, {
        lastLoginAt: new Date(),
      });
      const updatedUser = await this.userRepository.findOneById(adminUser.id);
      if (updatedUser) {
        adminUser = updatedUser;
      }
    }

    // 生成 JWT token（添加 admin 角色）
    const payload = {
      userId: adminUser.id,
      openid: adminUser.openid,
      username: adminUser.nickname,
      roles: ['admin'], // 管理员角色
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      userInfo: {
        id: adminUser.id,
        openid: adminUser.openid,
        nickname: adminUser.nickname,
        avatar: adminUser.avatar,
      },
    };
  }

  /**
   * 机构登录（用户名密码）
   */
  @Transactional()
  async institutionLogin(
    institutionLoginDto: InstitutionLoginDto,
  ): Promise<LoginResponseDto> {
    const { username, password } = institutionLoginDto;

    // 1. 从 users 表查询账号（通过 username）
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }

    if (!user.password) {
      throw new UnauthorizedException('账号异常，请联系管理员');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 2. 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 3. 获取用户关联的机构
    const institutions =
      await this.userInstitutionRepository.findInstitutionsByUserId(user.id);

    if (institutions.length === 0) {
      throw new UnauthorizedException('该账号未关联任何机构');
    }

    // 4. 取第一个机构作为当前登录机构（后续可支持多机构切换）
    const institutionId = institutions[0].institution_id;

    // 5. 检查机构是否被冻结（冻结状态的机构无法登录）
    const institutionRows = await this.dataSource.query(
      `SELECT audit_status FROM institutions WHERE id = $1 AND is_delete = false LIMIT 1`,
      [institutionId],
    );
    if (institutionRows.length > 0 && institutionRows[0].audit_status === 'frozen') {
      throw new UnauthorizedException('该机构已被冻结，请联系平台客服');
    }

    // 5. 更新最后登录时间
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // 6. 生成 JWT token（添加 institution 角色和 institutionId）
    const payload = {
      userId: user.id,
      openid: user.openid,
      username: user.nickname,
      roles: ['institution'],
      institutionId: institutionId, // 机构ID
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      userInfo: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        institutionId: institutionId, // 返回机构ID
      } as any,
    };
  }

  /**
   * 家长手机号登录（密码固定为66666666）
   * 效果与微信登录一致，创建普通家长用户
   */
  @Transactional()
  async parentPhoneLogin(dto: { phone: string }): Promise<LoginResponseDto> {
    const { phone } = dto;
    const FIXED_PASSWORD = '66666666';

    // 1. 查找或创建用户（通过手机号）
    let user = await this.userRepository.findByPhone(phone);

    if (!user) {
      // 首次登录，创建新用户
      user = this.userRepository.create({
        phone,
        openid: `parent_phone_${phone}`,
        nickname: `用户${phone.slice(-4)}`,
        lastLoginAt: new Date(),
      });
      const savedUser = await this.userRepository.save(user);
      user = savedUser;
    } else {
      // 更新最后登录时间
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });
      const updatedUser = await this.userRepository.findOneById(user.id);
      if (updatedUser) {
        user = updatedUser;
      }
    }

    // 2. 生成 JWT token（普通家长角色，与微信登录一致）
    const token = this.generateToken(user);

    // 3. 返回登录结果
    return {
      token,
      userInfo: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }

  /**
   * 更新用户资料
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<boolean> {
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 构建更新数据（只更新传入的字段）
    const updateData: Partial<UserEntity> = {};
    if (dto.nickname !== undefined) updateData.nickname = dto.nickname;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.gender !== undefined) updateData.gender = dto.gender;

    if (Object.keys(updateData).length === 0) {
      return true; // 没有需要更新的字段
    }

    await this.userRepository.update(userId, updateData);
    return true;
  }

  /**
   * 微信手机号登录（机构或教师）
   */
  @Transactional()
  async phoneLogin(dto: { code: string; type: 'institution' | 'teacher' }): Promise<LoginResponseDto> {
    // 1. 调用微信接口获取手机号（传入 type 以区分 mock 配置）
    const phone = await this.getWechatPhone(dto.code, dto.type);
    if (!phone) {
      throw new UnauthorizedException('获取手机号失败');
    }

    // 2. 查找用户
    const user = await this.userRepository.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('手机号未注册，请先注册');
    }

    // 3. 根据登录类型验证权限
    if (dto.type === 'institution') {
      // 机构登录：检查用户是否关联机构
      const institutions = await this.userInstitutionRepository.findInstitutionsByUserId(user.id);
      if (institutions.length === 0) {
        throw new UnauthorizedException('该手机号未关联任何机构');
      }

      // 取第一个机构作为当前登录机构
      const institutionId = institutions[0].institution_id;

      // ⚠️ 检查机构是否被冻结（与 institutionLogin 保持一致）
      const institutionRows = await this.dataSource.query(
        `SELECT audit_status FROM institutions WHERE id = $1 AND is_delete = false LIMIT 1`,
        [institutionId],
      );
      if (institutionRows.length > 0 && institutionRows[0].audit_status === 'frozen') {
        throw new UnauthorizedException('该机构已被冻结，请联系平台客服');
      }

      // 更新最后登录时间
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      // 生成 JWT token（包含机构ID）
      const payload = {
        userId: user.id,
        openid: user.openid,
        username: user.nickname,
        roles: ['institution'],
        institutionId: institutionId,
      };

      const token = this.jwtService.sign(payload);

      return {
        token,
        userInfo: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatar: user.avatar,
          institutionId: institutionId,
        } as any,
      };
    } else if (dto.type === 'teacher') {
      // 教师登录：检查用户是否关联教师
      const teachers = await this.teacherUserRepository.findByUserId(user.id);
      if (teachers.length === 0) {
        throw new UnauthorizedException('该手机号未关联任何教师');
      }

      // 取第一个教师作为当前登录教师
      const teacherUser = teachers[0];
      const teacherId = teacherUser.teacher_id;
      const institutionId = teacherUser.institution_id;

      // 更新最后登录时间
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      // 生成 JWT token（包含教师ID和机构ID）
      const payload = {
        userId: user.id,
        openid: user.openid,
        username: user.nickname,
        roles: ['teacher'],
        teacherId: teacherId,
        institutionId: institutionId,
      };

      const token = this.jwtService.sign(payload);

      return {
        token,
        userInfo: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatar: user.avatar,
          teacherId: teacherId,
          institutionId: institutionId,
        } as any,
      };
    }

    throw new UnauthorizedException('登录类型不正确');
  }

  /**
   * 调用微信接口获取手机号
   * 开发环境支持 mock 模式：
   * - institution 类型：通过 MOCK_INSTITUTION_PHONES 配置
   * - teacher 类型：通过 MOCK_TEACHER_PHONES 配置
   */
  private async getWechatPhone(code: string, type?: 'institution' | 'teacher'): Promise<string | null> {
    try {
      // 根据登录类型选择对应的 mock 配置
      const mockEnvKey = type === 'teacher' ? 'MOCK_TEACHER_PHONES' : 'MOCK_INSTITUTION_PHONES';
      const mockPhones = process.env[mockEnvKey];
      // 同时检查通用的机构 mock 配置作为兜底
      const fallbackMockPhones = process.env.MOCK_INSTITUTION_PHONES;
      const effectiveMockPhones = mockPhones || fallbackMockPhones;
      
      if (effectiveMockPhones) {
        const phoneList = effectiveMockPhones.split(',').map(p => p.trim()).filter(p => p);
        
        // 支持 mock_0, mock_1, mock_2 格式，对应配置中的第 N 个手机号
        if (code.startsWith('mock_')) {
          const index = parseInt(code.replace('mock_', ''), 10);
          if (!isNaN(index) && index >= 0 && index < phoneList.length) {
            const phone = phoneList[index];
            console.log(`[Mock][${type || 'default'}] 使用配置的手机号 [${index}]:`, phone);
            return phone;
          }
        }
        
        // 兼容旧格式：phone_13800138000_timestamp
        if (code.startsWith('phone_')) {
          const parts = code.split('_');
          if (parts.length >= 2 && /^1[3-9]\d{9}$/.test(parts[1])) {
            const phone = parts[1];
            console.log(`[Mock][${type || 'default'}] 从 code 中提取手机号:`, phone);
            return phone;
          }
        }
        
        // 默认使用第一个配置的手机号
        if (phoneList.length > 0) {
          console.log(`[Mock][${type || 'default'}] 使用默认配置的手机号:`, phoneList[0]);
          return phoneList[0];
        }
      }

      // 生产环境：调用微信接口获取手机号
      const accessToken = await this.getWechatAccessToken();
      if (!accessToken) {
        throw new Error('获取 access_token 失败');
      }

      const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
      const response = await axios.post(url, { code });

      if (response.data.errcode === 0 && response.data.phone_info) {
        return response.data.phone_info.phoneNumber;
      }

      console.error('获取手机号失败:', response.data);
      return null;
    } catch (error) {
      console.error('调用微信接口失败:', error);
      return null;
    }
  }

  /**
   * 获取微信 access_token
   */
  private async getWechatAccessToken(): Promise<string | null> {
    try {
      const appId = process.env.WECHAT_APP_ID;
      const appSecret = process.env.WECHAT_APP_SECRET;

      if (!appId || !appSecret) {
        throw new Error('微信配置缺失');
      }

      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
      const response = await axios.get(url);

      if (response.data.access_token) {
        return response.data.access_token;
      }

      console.error('获取 access_token 失败:', response.data);
      return null;
    } catch (error) {
      console.error('获取 access_token 失败:', error);
      return null;
    }
  }
}
