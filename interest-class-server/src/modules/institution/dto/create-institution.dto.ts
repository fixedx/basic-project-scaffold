import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// 账号信息子类
export class AccountInfoDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '请输入正确的手机号码',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '真实姓名最多50个字符' })
  real_name?: string;

  @IsOptional()
  @IsString()
  role?: string; // admin, staff 等

  @IsOptional()
  @IsString()
  remark?: string; // 备注
}

export class CreateInstitutionDto {
  // 账号列表（提交审核时必须提供，草稿保存可不提供）
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountInfoDto)
  accounts?: AccountInfoDto[];

  // 基础信息
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  introduction?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  // 位置信息
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  // 资质认证
  @IsOptional()
  @IsString()
  license_no?: string;

  @IsOptional()
  @IsString()
  license_img?: string;

  @IsOptional()
  @IsString()
  legal_person?: string;

  @IsOptional()
  id_card_imgs?: {
    front: string;
    back: string;
  };

  // 财务结算
  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  bank_account?: string;

  @IsOptional()
  @IsString()
  account_holder?: string;

  // 经营类目
  @IsOptional()
  @IsArray()
  category_ids?: string[];

  // 品牌宣传（子表）- 师资力量
  @IsOptional()
  @IsArray()
  teachers?: Array<{
    user_id?: string;
    name: string;
    title?: string;
    avatar_url?: string;
    tags?: string[];
    bio?: string;
    sort_order?: number;
    is_show?: boolean;
  }>;

  // 荣誉时刻
  @IsOptional()
  @IsArray()
  honors?: Array<{
    title: string;
    img_url: string;
    honor_date?: string;
    sort_order?: number;
  }>;

  // 教学环境（子表）
  @IsOptional()
  @IsArray()
  teaching_environments?: Array<{
    title?: string;
    img_url: string;
    description?: string;
    sort_order?: number;
  }>;

  // 学员风采（子表）
  @IsOptional()
  @IsArray()
  showcases?: Array<{
    title?: string;
    img_url: string;
    type?: string;
    description?: string;
    sort_order?: number;
  }>;
}
