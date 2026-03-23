# 稚小苗 Server 开发规范

## 项目概述

基于 NestJS + TypeORM + PostgreSQL 的后端服务，提供统一的认证、数据访问、事务管理等基础能力。

## 技术栈

- **框架**: NestJS v10+
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT + Passport
- **上下文管理**: nestjs-cls v6.1.0
- **包管理**: pnpm

---

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
```bash
cp .env.example .env
# 修改 .env 中的数据库连接等配置
```

### 初始化数据库

1. 创建数据库：
```bash
psql -U postgres -c "CREATE DATABASE interest_class;"
```

2. 启动服务（会自动创建表结构）：
```bash
pnpm run start:dev
```

3. 初始化枚举数据（必须执行）：
```bash
curl -X POST http://localhost:3000/api/enums/init
```

或在浏览器访问：`http://localhost:3000/api/enums/init`

这将初始化以下枚举数据：
- 课程类型（course_type）：正式课、试听课
- 机构类目（institution_category）：艺术类、体育类、学科类等
- 审核状态（audit_status）：待审核、已通过、已拒绝
- 返现类型（cashback_type）：按比例、固定金额、无返现

4. 执行额外的数据库迁移（如需）：
```bash
psql -U postgres -d interest_class -f migrations/create-classrooms-table.sql
psql -U postgres -d interest_class -f migrations/create-teachers-table.sql
```

---

## 核心开发规范

### 1. 目录结构规范

```
src/
├── common/                      # 公共模块
│   ├── decorators/             # 装饰器（如 @Transactional）
│   ├── entities/               # 基础实体类（BaseEntity）
│   ├── filters/                # 异常过滤器
│   ├── interceptors/           # 拦截器
│   ├── interfaces/             # 接口定义
│   ├── middleware/             # 中间件（Auth中间件）
│   ├── repositories/           # 基础仓储类（BaseRepository）
│   └── services/               # 公共服务（UserContextService）
├── config/                     # 配置文件
│   └── database.config.ts     # 数据库配置
├── modules/                    # 业务模块
│   ├── auth/                  # 认证模块（用户登录、注册、JWT）
│   │   ├── entities/          # UserEntity, UserInstitutionEntity
│   │   ├── repositories/      # UserRepository, UserInstitutionRepository
│   │   └── dto/               # WechatLoginDto
│   ├── classroom/             # 教室管理模块
│   │   ├── entities/          # ClassroomEntity（教室信息）
│   │   ├── repositories/      # ClassroomRepository
│   │   ├── dto/               # Create/Update/QueryClassroomDto
│   │   └── classroom.service.ts
│   ├── course/                # 课程管理模块
│   │   ├── entities/          # CourseEntity, CourseSkuEntity, CategoryEntity
│   │   ├── repositories/      # CourseRepository, CourseSkuRepository, CategoryRepository
│   │   ├── dto/               # Create/Update/QueryCourseDto
│   │   ├── course.service.ts
│   │   ├── sku.service.ts
│   │   └── category.service.ts
│   ├── demo/                  # 示例模块
│   │   ├── entities/          # DemoEntity
│   │   ├── repositories/      # DemoRepository
│   │   └── dto/               # Create/UpdateDemoDto
│   ├── institution/           # 机构管理模块
│   │   ├── entities/          # InstitutionEntity
│   │   ├── repositories/      # InstitutionRepository
│   │   ├── dto/               # Create/UpdateInstitutionDto
│   │   └── institution.service.ts
│   ├── oss/                   # 对象存储模块（文件上传）
│   │   ├── oss.service.ts    # OSS服务封装
│   │   └── dto/               # GenerateUploadTokenDto
│   └── teacher/               # 教师管理模块
│       ├── entities/          # TeacherEntity（教师信息）
│       ├── repositories/      # TeacherRepository
│       ├── dto/               # Create/Update/QueryTeacherDto
│       └── teacher.service.ts
└── utils/                      # 工具类
    ├── crypto.util.ts         # 加密工具（AES、密码哈希）
    ├── jwt.util.ts            # JWT工具
    ├── snowflake.util.ts      # 雪花ID生成器
    └── oss/                   # OSS客户端工具
        ├── aliyun-oss.service.ts    # 阿里云OSS
        ├── cloudflare-r2.service.ts # Cloudflare R2
        ├── qiniu-kodo.service.ts    # 七牛云
        └── tencent-cos.service.ts   # 腾讯云COS
```

## 已实现功能模块

### 1. 认证模块 (auth)
- 微信登录
- JWT令牌生成与验证
- 用户管理
- 机构-用户关联管理

### 2. 机构模块 (institution)
- 机构入驻申请
- 机构信息管理
- 机构审核流程

### 3. 课程模块 (course)
- 课程发布与管理
- 课程SKU（规格）管理
- 课程分类管理（14个预设分类）
- 年龄范围、课时时长设置

### 4. 教室模块 (classroom) ⭐
- 教室创建与编辑
- 设施设备管理（JSONB存储）
- 教室状态管理（可用、维护中、已停用）
- 按机构筛选、搜索

### 5. 教师模块 (teacher) ⭐
- 教师信息管理
- 教授科目管理（JSONB数组）
- 证书管理（JSONB数组）
- 教师状态管理（在职、休假、离职）
- 按机构筛选、搜索

### 6. OSS模块 (oss)
- 统一文件上传接口
- 支持多家云存储（阿里云、腾讯云、七牛云、Cloudflare R2）
- 预签名URL生成
- 文件类型校验

### 7. 枚举模块 (common/enums)
- 统一枚举管理（存储在数据库）
- 课程类型、机构类目、审核状态、返现类型等
- RESTful接口查询

```

### 2. 导入路径规范

**强制使用路径别名 `@`**，禁止使用相对路径：

```typescript
// ✅ 正确
import { BaseEntity } from '@/common/entities/base.entity';
import { UserContextService } from '@/common/services/user-context.service';
import { databaseConfig } from '@/config/database.config';
import { DemoModule } from '@/modules/demo/demo.module';
import { generateSnowflakeId } from '@/utils/snowflake.util';

// ❌ 错误
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserContextService } from '../../common/services/user-context.service';
```

**配置位置**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## API 返回值规范 ⭐

**统一返回值约定**：
- **新增（CREATE）**：返回新创建资源的 `id`（字符串）
- **修改（UPDATE）**：返回 `boolean`（true 表示成功）
- **删除（DELETE）**：返回 `boolean`（true 表示成功）
- **查询（GET）**：返回实体对象或数组

**示例**：
```typescript
// ✅ 正确
@Post()
async create(@Body() dto: CreateDto): Promise<string> {
  return this.service.create(dto); // 返回 "267293442025984000"
}

@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateDto): Promise<boolean> {
  return this.service.update(id, dto); // 返回 true
}

@Delete(':id')
async remove(@Param('id') id: string): Promise<boolean> {
  return this.service.remove(id); // 返回 true
}

@Get(':id')
async findOne(@Param('id') id: string): Promise<EntityType> {
  return this.service.findOne(id); // 返回完整实体对象
}

@Get()
async findAll(@Query() query: QueryDto): Promise<{ data: EntityType[], total: number, page: number, pageSize: number }> {
  return this.service.findAll(query); // 返回分页数据
}
```

**实际应用示例**：
```typescript
// CourseController
@Post()
async create(@Body() createDto: CreateCourseDto): Promise<string> {
  return this.courseService.create(createDto); // "267293442025984000"
}

// TeacherController
@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto): Promise<boolean> {
  return this.teacherService.update(id, dto); // true
}

// ClassroomController
@Delete(':id')
async remove(@Param('id') id: string): Promise<boolean> {
  return this.classroomService.remove(id); // true
}
```

**注意事项**：
- Controller 直接返回数据，由 Transform 拦截器自动包装成统一响应格式
- Service 层按照此规范实现返回值
- 前端可根据此规范进行类型推断

---

## 实体类规范

### 3. BaseEntity 使用规范

所有业务实体必须继承 `BaseEntity`：
```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('demo')
export class DemoEntity extends BaseEntity {
  @Column({ type: 'text', comment: '标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({ type: 'jsonb', nullable: true, comment: '扩展数据' })
  metadata?: Record<string, any>;
}
```

**BaseEntity 提供的字段**：
- `id`: 雪花算法生成的 16 位字符串 ID（自动生成）
- `is_active`: 是否激活（布尔值，默认 true）
- `created_by`: 创建人 ID（16 位字符串）
- `created_at`: 创建时间（UTC 时间戳）
- `updated_by`: 更新人 ID（16 位字符串）
- `updated_at`: 更新时间（UTC 时间戳）
- `is_delete`: 软删除标记（布尔值，默认 false）

**自动填充机制**：
- `id` 在插入前自动生成
- `created_by` 和 `updated_by` 在插入/更新时自动从当前用户上下文获取
- `created_at` 和 `updated_at` 由数据库自动管理

### 4. 字段类型规范

| 数据类型 | TypeORM 类型 | 说明 |
|---------|-------------|------|
| 文本 | `text` | 所有字符串字段统一使用 `text`，不使用 `varchar` |
| 时间 | `timestamp with time zone` | 所有时间字段，存储 UTC 时间 |
| JSON | `jsonb` | JSON 数据，支持索引和查询 |
| 布尔 | `boolean` | 布尔值 |
| 数字 | `integer` / `bigint` / `decimal` | 根据实际需求选择 |

```typescript
@Column({ type: 'text', comment: '名称' })
name: string;

@Column({ type: 'timestamp with time zone', comment: '过期时间' })
expiredAt: Date;

@Column({ type: 'jsonb', nullable: true, comment: '配置' })
config?: Record<string, any>;

@Column({ type: 'boolean', default: true, comment: '是否启用' })
enabled: boolean;
```

---

## Repository 规范

### 5. BaseRepository 使用规范

所有自定义 Repository 必须继承 `BaseRepository`：

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { DemoEntity } from '../entities/demo.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoRepository extends BaseRepository<DemoEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(DemoEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  // 自定义查询方法
  async findByTitle(title: string) {
    return this.getQuery()
      .where('entity.title = :title', { title })
      .getMany();
  }
}
```

**必须调用**: `this.setUserContextService(userCtx)` 以启用用户上下文功能

### 6. BaseRepository 提供的查询方法

所有查询方法**默认按 ID 降序排序**（最新的在前）。

#### 基础查询构建器

| 方法 | 说明 | 自动过滤 |
|-----|------|---------|
| `getQuery()` | 获取基础查询构建器 | 软删除（is_delete=false） |
| `getQueryWithActive()` | 获取激活状态查询构建器 | 软删除 + 激活状态 |
| `getQueryWithMyData(userId?)` | 获取当前用户数据查询构建器 | 软删除 + 创建人匹配 |

```typescript
// 基础查询
const query = this.repository.getQuery()
  .where('entity.status = :status', { status: 'active' })
  .orderBy('entity.created_at', 'DESC');

// 只查询激活的记录
const activeQuery = this.repository.getQueryWithActive();

// 只查询当前用户创建的记录
const myDataQuery = this.repository.getQueryWithMyData();
```

#### 常用查询方法

| 方法 | 说明 | 默认排序 |
|-----|------|---------|
| `findAllActive()` | 查询所有激活记录 | ID DESC |
| `findAllActiveAndEnabled()` | 查询所有激活且启用的记录 | ID DESC |
| `findMyData(userId?)` | 查询当前用户创建的记录 | ID DESC |
| `findOneById(id)` | 根据 ID 查询单条记录 | - |
| `findByIds(ids)` | 根据 ID 数组批量查询 | - |
| `paginate(page, pageSize, options?)` | 分页查询 | ID DESC |

#### 软删除方法

| 方法 | 说明 |
|-----|------|
| `softRemoveById(id)` | 根据 ID 软删除 |
| `softRemoveByIds(ids)` | 根据 ID 数组批量软删除 |
| `softRemoveEntity(entity)` | 软删除实体 |
| `softRemoveEntities(entities)` | 批量软删除实体 |
| `restoreById(id)` | 根据 ID 恢复软删除 |
| `restoreByIds(ids)` | 根据 ID 数组批量恢复 |
| `restoreEntity(entity)` | 恢复软删除实体 |
| `restoreEntities(entities)` | 批量恢复软删除实体 |

#### 分页查询示例

```typescript
const result = await this.repository.paginate(1, 10, {
  where: { status: 'active' },
  order: { created_at: 'DESC' }, // 可选，默认已按 ID DESC
});

// 返回格式
{
  data: [...],        // 数据列表
  total: 100,         // 总记录数
  page: 1,            // 当前页码
  pageSize: 10,       // 每页大小
  totalPages: 10      // 总页数
}
```

---

## 用户上下文规范

### 7. UserContextService 使用规范

**禁止手动传递 userId 参数**，统一使用 `UserContextService` 获取当前用户信息。

```typescript
import { Injectable } from '@nestjs/common';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoService {
  constructor(
    private userContextService: UserContextService,
  ) {}

  async doSomething() {
    // 获取当前用户 ID（必存在，不存在会抛异常）
    const userId = this.userContextService.getCurrentUserId();

    // 获取当前用户 ID（可能为 null）
    const userIdOrNull = this.userContextService.getCurrentUserIdOrNull();

    // 获取当前用户完整信息
    const user = this.userContextService.getCurrentUser();

    // 获取当前用户名
    const username = this.userContextService.getCurrentUsername();

    // 获取当前用户角色
    const roles = this.userContextService.getCurrentUserRoles();

    // 权限检查
    const hasAdmin = this.userContextService.hasRole('admin');
    const hasAny = this.userContextService.hasAnyRole(['admin', 'editor']);
    const hasAll = this.userContextService.hasAllRoles(['user', 'verified']);
  }
}
```

**UserContextService 提供的方法**：

| 方法 | 返回类型 | 说明 |
|-----|---------|------|
| `getCurrentUserId()` | `string` | 获取当前用户 ID，不存在抛异常 |
| `getCurrentUserIdOrNull()` | `string \| null` | 获取当前用户 ID，可能为 null |
| `getCurrentUser()` | `UserContext` | 获取当前用户完整信息 |
| `getCurrentUserOrNull()` | `UserContext \| null` | 获取当前用户信息，可能为 null |
| `getCurrentUsername()` | `string \| undefined` | 获取当前用户名 |
| `getCurrentUserRoles()` | `string[] \| undefined` | 获取当前用户角色列表 |
| `hasRole(role)` | `boolean` | 检查是否拥有指定角色 |
| `hasAnyRole(roles)` | `boolean` | 检查是否拥有任一角色 |
| `hasAllRoles(roles)` | `boolean` | 检查是否拥有所有角色 |

**示例：在 Controller 中使用**

```typescript
@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoService: DemoService,
    private readonly userContextService: UserContextService,
  ) {}

  @Get('current-user')
  async getCurrentUser() {
    return {
      userId: this.userContextService.getCurrentUserId(),
      username: this.userContextService.getCurrentUsername(),
      roles: this.userContextService.getCurrentUserRoles(),
    };
  }
}
```

---

## 事务管理规范

### 8. @Transactional 装饰器使用规范

使用 `@Transactional()` 装饰器进行事务管理，支持嵌套事务。

```typescript
import { Injectable } from '@nestjs/common';
import { Transactional } from '@/common/decorators/transaction.decorator';

@Injectable()
export class DemoService {
  constructor(
    private demoRepository: DemoRepository,
    private dataSource: DataSource,
  ) {}

  @Transactional()
  async create(dto: CreateDemoDto): Promise<string> {
    const demo = this.demoRepository.create(dto);
    const saved = await this.demoRepository.save(demo);
    return saved.id;
  }

  @Transactional()
  async batchCreate(dtos: CreateDemoDto[]): Promise<string[]> {
    const ids: string[] = [];
    for (const dto of dtos) {
      // 嵌套调用带 @Transactional 的方法，会使用同一个事务
      const id = await this.create(dto);
      ids.push(id);
    }
    return ids;
  }
}
```

**注意事项**：
- 被装饰的方法必须是异步方法（返回 Promise）
- Service 类必须注入 `DataSource`
- 支持嵌套事务（内层方法的事务会加入外层事务）
- 任何异常都会导致事务回滚

---

## 工具类使用规范

### 9. 雪花 ID 生成器

```typescript
import { generateSnowflakeId } from '@/utils/snowflake.util';

// 生成 16 位数字字符串 ID
const id = generateSnowflakeId();
// 例如: "1234567890123456"
```

**特性**：
- 16 位数字字符串
- 全局唯一
- 时间有序
- 分布式安全

### 10. JWT 工具类

```typescript
import { JwtUtil } from '@/utils/jwt.util';

const jwtUtil = new JwtUtil('your-secret-key');

// 签发 Token
const token = jwtUtil.sign(
  { userId: '123', username: 'admin' },
  { expiresIn: '7d' }
);

// 验证 Token
try {
  const payload = jwtUtil.verify(token);
  console.log(payload); // { userId: '123', username: 'admin', ... }
} catch (error) {
  console.error('Token 无效或已过期');
}

// 刷新 Token
const newToken = jwtUtil.refreshToken(token, { expiresIn: '7d' });

// 解码 Token（不验证）
const decoded = jwtUtil.decode(token);
```

### 11. 加密工具类

```typescript
import { CryptoUtil } from '@/utils/crypto.util';

const cryptoUtil = new CryptoUtil('your-encryption-key');

// AES 加密/解密
const encrypted = cryptoUtil.encrypt('sensitive data');
const decrypted = cryptoUtil.decrypt(encrypted);

// 哈希
const hash = cryptoUtil.hash('password123');

// 密码加密/验证
const hashedPassword = await cryptoUtil.hashPassword('password123');
const isValid = await cryptoUtil.verifyPassword('password123', hashedPassword);
```

---

## 接口响应规范

### 12. 统一响应格式

所有接口响应自动格式化为：

```typescript
{
  code: 200,           // 状态码
  data: any,           // 业务数据
  message: 'success'   // 提示信息
}
```

**成功响应**：
```json
{
  "code": 200,
  "data": {
    "id": "1234567890123456",
    "title": "示例"
  },
  "message": "success"
}
```

**错误响应**：
```json
{
  "code": 400,
  "data": null,
  "message": "参数错误"
}
```

**Controller 中直接返回业务数据即可**：
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  // 直接返回数据，拦截器会自动包装
  return await this.demoService.findOne(id);
}
```

---

## 认证中间件规范

### 13. JWT 认证

所有请求自动经过 JWT 认证中间件（可配置排除路由）。

**Token 格式**：
```
Authorization: Bearer <token>
```

**中间件功能**：
1. 验证 Token 有效性
2. 解析 Token 中的用户信息
3. 将用户信息存入请求上下文（nestjs-cls）
4. 后续可通过 `UserContextService` 访问

**排除认证的路由**（在 `app.module.ts` 配置）：
```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        'auth/login',      // 登录接口
        'auth/register',   // 注册接口
        'health',          // 健康检查
      )
      .forRoutes('*');
  }
}
```

---

## Module 注册规范

### 14. 模块依赖注入

**注册 Repository**：
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoEntity } from './entities/demo.entity';
import { DemoRepository } from './repositories/demo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DemoEntity])],
  controllers: [DemoController],
  providers: [DemoService, DemoRepository],
  exports: [DemoService, DemoRepository], // 如需导出
})
export class DemoModule {}
```

**全局服务注册**（如 UserContextService）：
```typescript
// app.module.ts
@Module({
  providers: [AppService, UserContextService],
  exports: [UserContextService],
})
export class AppModule {}
```

---

## 数据库配置规范

### 15. TypeORM 配置

**配置文件**: `src/config/database.config.ts`

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'interest_class',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // 生产环境必须关闭
  logging: process.env.NODE_ENV === 'development',
  timezone: 'Z', // UTC 时区
};
```

**环境变量**（`.env` 文件）：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=interest_class

JWT_SECRET=your-secret-key-change-in-production
```

---

## 代码风格规范

### 16. 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 类名 | PascalCase | `DemoEntity`, `DemoService` |
| 文件名 | kebab-case | `demo.entity.ts`, `demo.service.ts` |
| 变量/方法 | camelCase | `userId`, `findAllActive()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| 数据库表名 | snake_case | `demo`, `user_profile` |
| 数据库字段 | snake_case | `user_id`, `created_at` |

### 17. 注释规范

**类注释**：
```typescript
/**
 * Demo 实体
 * 用于演示基础实体的使用
 */
@Entity('demo')
export class DemoEntity extends BaseEntity {
```

**方法注释**：
```typescript
/**
 * 创建 Demo
 * @param createDemoDto 创建参数
 * @returns 返回新创建记录的 ID
 */
async create(createDemoDto: CreateDemoDto): Promise<string> {
```

**字段注释**（使用 TypeORM 的 comment）：
```typescript
@Column({ type: 'text', comment: '标题' })
title: string;
```

---

## 错误处理规范

### 18. 异常处理

使用 NestJS 内置异常类：

```typescript
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

// 参数错误
throw new BadRequestException('参数不能为空');

// 资源不存在
throw new NotFoundException(`ID 为 ${id} 的记录不存在`);

// 未认证
throw new UnauthorizedException('Token 无效或已过期');

// 无权限
throw new ForbiddenException('无权访问该资源');
```

所有异常会被全局异常过滤器统一处理，返回标准格式。

---

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接
```

### 运行项目
```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

### 数据库迁移
```bash
# 生成迁移文件
pnpm run migration:generate -- src/migrations/[MigrationName]

# 运行迁移
pnpm run migration:run

# 回滚迁移
pnpm run migration:revert
```

---

## 常见问题

### Q: 为什么要使用 @ 路径别名？
A: 避免相对路径层级过深（`../../../`），提高代码可读性和可维护性。

### Q: 为什么不手动传递 userId？
A: 使用 nestjs-cls 和 UserContextService 实现请求级别的上下文传递，代码更简洁、更安全。

### Q: BaseEntity 的字段可以自定义吗？
A: 可以在业务实体中添加自定义字段，但基础字段（id、created_by 等）由 BaseEntity 统一管理。

### Q: 如何禁用某个接口的认证？
A: 在 `app.module.ts` 的 `configure` 方法中使用 `.exclude()` 排除该路由。

---

## API接口列表

### 认证相关
- `POST /api/auth/wechat-login` - 微信登录
- `POST /api/auth/phone-login` - 手机号登录
- `GET /api/auth/profile` - 获取当前用户信息

### 机构相关
- `POST /api/institution` - 创建机构（入驻申请）
- `GET /api/institution` - 获取机构列表
- `GET /api/institution/:id` - 获取机构详情
- `PUT /api/institution/:id` - 更新机构信息
- `DELETE /api/institution/:id` - 删除机构（软删除）

### 课程相关
- `POST /api/course` - 创建课程
- `GET /api/course` - 获取课程列表
- `GET /api/course/:id` - 获取课程详情
- `PUT /api/course/:id` - 更新课程
- `DELETE /api/course/:id` - 删除课程（软删除）
- `GET /api/category` - 获取课程分类
- `POST /api/category/init` - 初始化默认分类（14个）

### 教室管理 ⭐
- `POST /api/classroom` - 创建教室
- `GET /api/classroom` - 获取教室列表
  - 参数：`institutionId`（必填）、`keyword`（可选）、`status`（可选）
- `GET /api/classroom/:id` - 获取教室详情
- `PUT /api/classroom/:id` - 更新教室
- `DELETE /api/classroom/:id` - 删除教室（软删除）
- `POST /api/classroom/sort` - 批量更新排序

### 教师管理 ⭐
- `POST /api/teacher` - 创建教师
- `GET /api/teacher` - 获取教师列表
  - 参数：`institutionId`（必填）、`keyword`（可选）、`status`（可选）、`subject`（可选）
- `GET /api/teacher/:id` - 获取教师详情
- `PUT /api/teacher/:id` - 更新教师
- `DELETE /api/teacher/:id` - 删除教师（软删除）
- `POST /api/teacher/sort` - 批量更新排序

### 枚举管理
- `GET /api/enums` - 获取所有枚举
- `GET /api/enums/:type` - 获取指定类型枚举
- `GET /api/enums?types=type1,type2` - 批量获取枚举
- `POST /api/enums/init` - 初始化默认枚举

### 文件上传
- `POST /api/oss/generate-upload-token` - 生成上传凭证
  - 支持：阿里云OSS、腾讯云COS、七牛云Kodo、Cloudflare R2

---

**最后更新**: 2025-12-25

### Q: 查询结果如何自定义排序？
A: 虽然默认按 ID DESC，但可以在调用查询方法时传入自定义的 `order` 选项覆盖默认值。

---

## 更新日志

- **2025-12-14**: 初始版本，建立核心开发规范

5**: 移除 AI 提示词模板，优化字段类型规范说明
- **2025-12-1