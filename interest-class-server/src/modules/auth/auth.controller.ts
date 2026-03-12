import { Controller, Post, Body, Get, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto, LoginResponseDto } from './dto/wechat-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { InstitutionLoginDto } from './dto/institution-login.dto';
import { PhoneLoginDto } from './dto/phone-login.dto';
import { ParentPhoneLoginDto } from './dto/parent-phone-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserContextService } from '@/common/services/user-context.service';
import { UserInstitutionRepository } from './repositories/user-institution.repository';
import { InstitutionRepository } from '@/modules/institution/repositories/institution.repository';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userContextService: UserContextService,
    private readonly userInstitutionRepository: UserInstitutionRepository,
    private readonly institutionRepository: InstitutionRepository,
  ) {}

  /**
   * 微信小程序登录
   */
  @Post('wechat-login')
  async wechatLogin(
    @Body() wechatLoginDto: WechatLoginDto,
  ): Promise<LoginResponseDto> {
    console.log('收到登录请求，请求体:', wechatLoginDto);

    if (!wechatLoginDto || !wechatLoginDto.code) {
      throw new Error('登录参数错误：缺少 code 字段');
    }

    return await this.authService.wechatLogin(wechatLoginDto);
  }

  /**
   * 微信手机号登录（机构/教师）
   */
  @Post('phone-login')
  async phoneLogin(
    @Body() phoneLoginDto: PhoneLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.phoneLogin(phoneLoginDto);
  }

  /**
   * 管理员登录（用户名密码）
   */
  @Post('admin-login')
  async adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.adminLogin(adminLoginDto);
  }

  /**
   * 机构登录（用户名密码）
   */
  @Post('institution-login')
  async institutionLogin(
    @Body() institutionLoginDto: InstitutionLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.institutionLogin(institutionLoginDto);
  }

  /**
   * 家长手机号登录（密码固定为66666666）
   */
  @Post('parent-phone-login')
  async parentPhoneLogin(
    @Body() parentPhoneLoginDto: ParentPhoneLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.parentPhoneLogin(parentPhoneLoginDto);
  }

  /**
   * 获取当前用户信息
   */
  @Get('user-info')
  async getUserInfo() {
    const userId = this.userContextService.getCurrentUserId();
    return await this.authService.getUserInfo(userId);
  }

  /**
   * 更新用户资料（昵称、头像、手机号等）
   */
  @Put('profile')
  async updateProfile(@Body() dto: UpdateProfileDto): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();
    return await this.authService.updateProfile(userId, dto);
  }

  /**
   * 获取当前用户的机构列表
   */
  @Get('my-institutions')
  async getMyInstitutions() {
    const userId = this.userContextService.getCurrentUserId();
    const userInstitutions =
      await this.userInstitutionRepository.findByUserId(userId);

    // 获取机构详情
    const institutionIds = userInstitutions.map((ui) => ui.institution_id);
    const institutions =
      await this.institutionRepository.findByIds(institutionIds);

    // 合并角色信息
    return institutions.map((institution) => {
      const userInstitution = userInstitutions.find(
        (ui) => ui.institution_id === institution.id,
      );
      return {
        ...institution,
        role: userInstitution?.role || 'staff',
      };
    });
  }
}
