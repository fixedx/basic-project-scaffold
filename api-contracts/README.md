# API 契约文档

> 前后端测试协作的核心文档

## 目录结构

```
api-contracts/
├── README.md              # 本说明文档
├── TEMPLATE.json          # 契约模板
├── schemas/               # JSON Schema 定义
│   └── api-contract.schema.json
├── auth/                  # 认证模块契约
├── order/                 # 订单模块契约
├── booking/               # 预约模块契约
├── check-in/              # 签到模块契约
├── course/                # 课程模块契约
├── invite/                # 邀请模块契约
└── ...                    # 其他模块
```

## 工作流程

### 1. 后端开发阶段

**职责：**
- 开发 API 接口
- 创建/更新契约文件（填写 backend 部分）
- 确保契约与代码一致

**示例：**
```bash
# 开发签到接口
cp TEMPLATE.json check-in/sign-in.json
# 填写 backend 部分
# 提交代码时一并提交契约文件
```

### 2. 前端开发阶段

**职责：**
- 读取后端生成的契约（backend 部分）
- 开发前端页面
- 补充契约文件（填写 frontend 部分）

**注意：**
- 如发现接口与契约不一致，立即通知后端更新
- 不要修改 backend 部分，只补充 frontend 部分

### 3. QA测试阶段

**职责：**
- 读取完整契约（backend + frontend）
- 编写测试用例（填写 qa 部分）
- 执行测试并记录结果

### 4. 契约更新规则

| 场景 | 操作 | 负责人 |
|------|------|--------|
| 新增接口 | 创建新契约文件 | 后端 |
| 修改接口 | 更新契约并增加版本号 | 后端 |
| 删除接口 | 标记废弃，保留文件 | 后端 |
| 页面变更 | 更新 frontend 部分 | 前端 |
| 测试用例 | 更新 qa 部分 | QA |

## 契约规范

### 字段说明

**顶层字段：**
- `feature`: 功能名称（中文）
- `description`: 功能描述
- `version`: 版本号（语义化版本）
- `created_at`: 创建日期
- `updated_at`: 更新日期

**backend 字段：**
- `endpoints`: 接口列表数组
- 每个接口包含 path, method, request, response, error_codes

**frontend 字段：**
- `pages`: 页面列表数组
- 每个页面包含 path, elements, flow, state_management

**qa 字段：**
- `test_cases`: 测试用例数组
- `automation`: 自动化测试标记

## 使用示例

### 后端读取契约（生成API文档）

```typescript
import contract from './api-contracts/order/create.json';

// 使用契约生成 Swagger 文档
// 或使用契约做参数校验
```

### 前端读取契约（类型定义）

```typescript
import contract from './api-contracts/order/create.json';

// 根据契约生成 TypeScript 类型
type CreateOrderRequest = typeof contract.backend.endpoints[0]['request']['body'];
type CreateOrderResponse = typeof contract.backend.endpoints[0]['response']['success']['body'];
```

### QA读取契约（测试用例）

```typescript
import contract from './api-contracts/order/create.json';

// 根据契约生成测试用例
contract.qa.test_cases.forEach(tc => {
  it(tc.title, () => {
    // 执行测试
  });
});
```

## 工具脚本

### 验证契约格式

```bash
# 验证单个契约
node scripts/validate-contract.js check-in/sign-in.json

# 验证所有契约
node scripts/validate-contract.js --all
```

### 生成 TypeScript 类型

```bash
node scripts/generate-types.js order/create.json
```

### 对比契约与代码

```bash
# 检查代码是否与契约一致
node scripts/check-contract.js
```

## 最佳实践

1. **契约先行**：后端先定义契约，再写代码
2. **版本控制**：契约文件纳入 Git 管理
3. **及时更新**：接口变更必须同步更新契约
4. **自动化检查**：CI/CD 中验证契约一致性
5. **团队协作**：契约是前后端测试的沟通桥梁

## 常见问题

**Q: 契约和代码不一致怎么办？**
A: 以契约为准，修改代码使其符合契约。

**Q: 紧急修复可以跳过契约吗？**
A: 不可以，紧急修复后必须立即更新契约。

**Q: 契约由谁维护？**
A: 各自维护自己的部分：
- 后端维护 backend
- 前端维护 frontend  
- QA维护 qa

**Q: 如何知道契约更新了？**
A: 关注 Git 提交，或设置文件变更通知。

---

**契约是团队协作的契约，请认真对待！**
