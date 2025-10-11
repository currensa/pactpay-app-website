# 用户登录与组织选择 Workflow

## 一、核心概念

### Session 数据结构

```typescript
interface UserSession {
  userId: string;
  address: string;
  role: 'enterprise_admin' | 'employee' | 'platform_admin';

  // 当前选中的组织（默认为null）
  currentCompanyId: string | null;

  // 用户有权访问的所有组织
  availableCompanies: Array<{
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
  }>;

  // Session元数据
  createdAt: string;
  expiresAt: string;
}
```

### JWT Token 结构

```typescript
interface JWTPayload {
  sub: string; // userId
  address: string; // 钱包地址
  role: string; // 用户角色
  companyId?: string; // 当前选中的组织ID（可选）
  iat: number;
  exp: number;
}
```

---

## 二、完整登录流程

### 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│ 第一阶段：钱包认证（无组织上下文）                                   │
└─────────────────────────────────────────────────────────────────┘

1. 用户点击"Connect Wallet"
   │
   ├─→ POST /enterprise/auth/message
   │   Request: { address, chainId }
   │   Response: { message, nonce }
   │
   ├─→ 用户在钱包中签名
   │
   └─→ POST /enterprise/auth/login
       Request: { message, signature, address }
       Response: {
         accessToken: "jwt_without_company_context",
         user: {
           id: "uuid",
           address: "0x...",
           hasCompanies: true,
           needsCompanySelection: true
         }
       }

┌─────────────────────────────────────────────────────────────────┐
│ 第二阶段：组织选择                                                 │
└─────────────────────────────────────────────────────────────────┘

2. 检查用户组织状态
   │
   ├─→ GET /enterprise/companies/available
   │   Headers: { Authorization: "Bearer jwt_without_company" }
   │   Response: {
   │     companies: [
   │       { id: "uuid1", name: "公司A", role: "owner" },
   │       { id: "uuid2", name: "公司B", role: "admin" }
   │     ]
   │   }
   │
   ├─→ IF companies.length === 0:
   │   │   ┌──────────────────────────────────────┐
   │   │   │ 引导用户创建新组织                    │
   │   │   └──────────────────────────────────────┘
   │   │
   │   └─→ POST /enterprise/companies
   │       Request: { name: "我的公司" }
   │       Response: { id: "new_company_id", ... }
   │
   ├─→ IF companies.length === 1:
   │   │   ┌──────────────────────────────────────┐
   │   │   │ 自动选择唯一的组织                    │
   │   │   └──────────────────────────────────────┘
   │   │
   │   └─→ POST /enterprise/session/select-company
   │       Request: { companyId: "uuid1" }
   │       Response: { accessToken: "jwt_with_company" }
   │
   └─→ IF companies.length > 1:
       │   ┌──────────────────────────────────────┐
       │   │ 显示组织选择页面                      │
       │   └──────────────────────────────────────┘
       │
       └─→ POST /enterprise/session/select-company
           Request: { companyId: "selected_uuid" }
           Response: { accessToken: "jwt_with_company" }

┌─────────────────────────────────────────────────────────────────┐
│ 第三阶段：进入应用主界面                                           │
└─────────────────────────────────────────────────────────────────┘

3. 使用带有组织上下文的Token访问资源
   │
   └─→ GET /enterprise/companies/:companyId/dashboard
       Headers: { Authorization: "Bearer jwt_with_company" }

       ✅ 后端自动验证：
          - JWT中的companyId与URL参数匹配
          - 用户有权访问该组织
```

---

## 三、关键API设计

### 3.1 第一阶段：钱包认证

#### 获取签名消息

**POST** `/enterprise/auth/message`

请求:

```json
{
  "address": "0x123...",
  "chainId": 1
}
```

响应:

```json
{
  "message": "app.example.com wants you to sign in with your Ethereum account:\n0x123...\n\nSign in to Safe Payroll\n\nURI: https://app.example.com\nVersion: 1\nChain ID: 1\nNonce: abc123xyz\nIssued At: 2025-10-04T10:00:00Z",
  "nonce": "abc123xyz"
}
```

#### 钱包登录（无组织上下文）

**POST** `/enterprise/auth/login`

请求:

```json
{
  "message": "...",
  "signature": "0xSignature...",
  "address": "0x123..."
}
```

响应:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "user_uuid",
    "address": "0x123...",
    "ensName": "alice.eth",
    "role": "enterprise_admin",
    "hasCompanies": true,
    "needsCompanySelection": true
  }
}
```

**注意：** 此时的JWT中**不包含**`companyId`字段

---

### 3.2 第二阶段：组织管理

#### 获取可用组织列表

**GET** `/enterprise/companies/available`

Headers:

```
Authorization: Bearer {accessToken}
```

响应:

```json
{
  "companies": [
    {
      "id": "company_uuid_1",
      "name": "ABC科技有限公司",
      "role": "owner",
      "memberCount": 3,
      "employeeCount": 15,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "company_uuid_2",
      "name": "XYZ咨询公司",
      "role": "admin",
      "memberCount": 5,
      "employeeCount": 8,
      "createdAt": "2025-03-01T00:00:00Z"
    }
  ],
  "total": 2,
  "lastSelectedCompanyId": "company_uuid_1"
}
```

#### 选择当前组织

**POST** `/enterprise/session/select-company`

Headers:

```
Authorization: Bearer {accessToken}
```

请求:

```json
{
  "companyId": "company_uuid_1"
}
```

响应:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "company": {
    "id": "company_uuid_1",
    "name": "ABC科技有限公司",
    "role": "owner"
  },
  "redirectTo": "/enterprise/companies/company_uuid_1/dashboard"
}
```

**注意：** 新的JWT中**包含**`companyId`字段

#### 切换当前组织

**POST** `/enterprise/session/switch-company`

请求:

```json
{
  "companyId": "company_uuid_2"
}
```

响应: 同上，返回新的带有不同`companyId`的JWT

#### 获取当前Session信息

**GET** `/enterprise/session`

响应:

```json
{
  "user": {
    "id": "user_uuid",
    "address": "0x123...",
    "ensName": "alice.eth"
  },
  "currentCompany": {
    "id": "company_uuid_1",
    "name": "ABC科技有限公司",
    "role": "owner"
  },
  "availableCompanies": [...]
}
```

---

### 3.3 组织创建（首次用户）

#### 创建新组织

**POST** `/enterprise/companies`

Headers:

```
Authorization: Bearer {accessToken_without_company}
```

请求:

```json
{
  "name": "我的新公司",
  "description": "公司描述"
}
```

响应:

```json
{
  "id": "new_company_uuid",
  "name": "我的新公司",
  "description": "公司描述",
  "role": "owner",
  "createdAt": "2025-10-04T10:00:00Z",
  "createdBy": "0x123..."
}
```

创建成功后，前端应立即调用 `POST /enterprise/session/select-company` 选择该组织。

---

## 四、前端实现示例

### 4.1 登录流程（React + TypeScript）

```typescript
// auth.service.ts
class AuthService {
  // 第一步：连接钱包并登录
  async loginWithWallet(address: string, chainId: number) {
    // 1. 获取签名消息
    const { message, nonce } = await api.post('/enterprise/auth/message', {
      address,
      chainId,
    });

    // 2. 请求用户签名
    const signature = await walletProvider.signMessage(message);

    // 3. 提交签名，获取初始Token
    const loginResponse = await api.post('/enterprise/auth/login', {
      message,
      signature,
      address,
    });

    // 4. 保存Token（无组织上下文）
    localStorage.setItem('accessToken', loginResponse.accessToken);

    return loginResponse;
  }

  // 第二步：处理组织选择
  async handleCompanySelection() {
    // 获取可用组织列表
    const { companies, lastSelectedCompanyId } = await api.get('/enterprise/companies/available');

    if (companies.length === 0) {
      // 场景1：无组织，引导创建
      return { needsCompanyCreation: true };
    } else if (companies.length === 1) {
      // 场景2：只有一个组织，自动选择
      await this.selectCompany(companies[0].id);
      return { success: true, companyId: companies[0].id };
    } else {
      // 场景3：多个组织，显示选择界面
      // 优先选择上次使用的组织
      if (lastSelectedCompanyId) {
        const lastCompany = companies.find((c) => c.id === lastSelectedCompanyId);
        if (lastCompany) {
          // 可以自动选择上次的组织，或显示UI让用户确认
          return {
            needsSelection: true,
            companies,
            suggested: lastCompany,
          };
        }
      }

      return { needsSelection: true, companies };
    }
  }

  // 第三步：选择组织
  async selectCompany(companyId: string) {
    const response = await api.post('/enterprise/session/select-company', {
      companyId,
    });

    // 更新Token（带组织上下文）
    localStorage.setItem('accessToken', response.accessToken);

    return response;
  }

  // 切换组织
  async switchCompany(companyId: string) {
    const response = await api.post('/enterprise/session/switch-company', {
      companyId,
    });

    // 更新Token
    localStorage.setItem('accessToken', response.accessToken);

    // 重定向到新组织的Dashboard
    window.location.href = response.redirectTo;
  }
}
```

### 4.2 路由守卫实现

```typescript
// router/guards.ts
import { useAuthStore } from '@/stores/auth';

export async function requireAuth(to, from, next) {
  const authStore = useAuthStore();

  // 1. 检查是否已登录（有Token）
  if (!authStore.isAuthenticated) {
    return next('/login');
  }

  // 2. 检查是否已选择组织
  if (!authStore.hasSelectedCompany) {
    // 跳转到组织选择页面
    return next('/select-company');
  }

  // 3. 检查访问的组织是否匹配当前Session
  const requestedCompanyId = to.params.companyId;
  if (requestedCompanyId && requestedCompanyId !== authStore.currentCompanyId) {
    // 用户尝试访问其他组织，检查权限
    const hasAccess = await authStore.checkCompanyAccess(requestedCompanyId);
    if (!hasAccess) {
      return next('/unauthorized');
    }

    // 如果有权限，询问是否切换
    // 或自动切换
    await authStore.switchCompany(requestedCompanyId);
  }

  next();
}
```

### 4.3 组织选择页面组件

```typescript
// pages/SelectCompany.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SelectCompany() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    const result = await authService.handleCompanySelection();

    if (result.needsCompanyCreation) {
      // 跳转到创建组织页面
      navigate('/create-company');

    } else if (result.success) {
      // 自动选择成功，跳转到Dashboard
      navigate(`/enterprise/companies/${result.companyId}/dashboard`);

    } else if (result.needsSelection) {
      // 显示选择界面
      setCompanies(result.companies);
      setLoading(false);
    }
  }

  async function handleSelectCompany(companyId: string) {
    setLoading(true);
    await authService.selectCompany(companyId);
    navigate(`/enterprise/companies/${companyId}/dashboard`);
  }

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="select-company-page">
      <h1>选择组织</h1>
      <div className="company-list">
        {companies.map(company => (
          <div
            key={company.id}
            className="company-card"
            onClick={() => handleSelectCompany(company.id)}
          >
            <h3>{company.name}</h3>
            <p>角色: {company.role}</p>
            <p>员工数: {company.employeeCount}</p>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/create-company')}>
        创建新组织
      </button>
    </div>
  );
}
```

---

## 五、后端实现要点

### 5.1 Session管理Service

```typescript
// src/modules/auth/session.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SessionService {
  constructor(private jwtService: JwtService) {}

  // 创建初始Token（无组织上下文）
  createInitialToken(user: User): string {
    const payload = {
      sub: user.id,
      address: user.address,
      role: user.role,
      // 注意：不包含companyId
    };

    return this.jwtService.sign(payload, {
      expiresIn: '24h',
    });
  }

  // 创建带组织上下文的Token
  createCompanyToken(user: User, companyId: string): string {
    const payload = {
      sub: user.id,
      address: user.address,
      role: user.role,
      companyId, // 包含组织ID
    };

    return this.jwtService.sign(payload, {
      expiresIn: '24h',
    });
  }

  // 验证用户对组织的访问权限
  async validateCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    // 检查用户是否是该组织的成员
    const membership = await this.companyMemberRepository.findOne({
      where: { userId, companyId },
    });

    return !!membership;
  }
}
```

### 5.2 JWT验证守卫

```typescript
// src/common/guards/company-context.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CompanyContextGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 来自JWT

    // 获取URL中的companyId参数
    const requestedCompanyId = request.params.companyId;

    if (!requestedCompanyId) {
      // 没有请求特定组织的资源，允许通过
      return true;
    }

    // 检查JWT中的companyId是否匹配
    if (user.companyId !== requestedCompanyId) {
      throw new ForbiddenException('Token中的组织上下文与请求的组织不匹配');
    }

    return true;
  }
}
```

### 5.3 使用示例

```typescript
// src/modules/employee/employee.controller.ts
import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '@/common/guards/company-context.guard';

@Controller('enterprise/companies/:companyId/employees')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class EmployeeController {
  @Get()
  async getEmployees(@Param('companyId') companyId: string) {
    // 此时已确保：
    // 1. 用户已认证
    // 2. JWT中的companyId与URL参数匹配
    // 3. 用户有权访问该组织

    return this.employeeService.findAll(companyId);
  }
}
```

---

## 六、边界情况处理

### 6.1 Token过期处理

```typescript
// 前端自动刷新Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除本地状态
      localStorage.removeItem('accessToken');

      // 重定向到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### 6.2 用户被移除出组织

```typescript
// 后端：定期检查用户权限
@Injectable()
export class CompanyMembershipService {
  async checkMembershipStatus(userId: string, companyId: string) {
    const membership = await this.findMembership(userId, companyId);

    if (!membership || membership.status === 'removed') {
      throw new ForbiddenException('您已不再是该组织的成员');
    }

    return membership;
  }
}
```

### 6.3 并发登录处理

```typescript
// 可选：限制同一用户的并发Session数量
@Injectable()
export class SessionService {
  async createSession(userId: string, companyId: string) {
    // 检查活跃Session数量
    const activeSessions = await this.getActiveSessions(userId);

    if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      // 使最旧的Session失效
      await this.invalidateSession(activeSessions[0].id);
    }

    // 创建新Session
    return this.createNewSession(userId, companyId);
  }
}
```

---

## 七、安全考虑

### 7.1 防止组织ID伪造

```typescript
// ❌ 错误做法：信任客户端传来的companyId
@Get()
async getEmployees(@Query('companyId') companyId: string) {
  // 危险！客户端可以传任意companyId
  return this.employeeService.findAll(companyId);
}

// ✅ 正确做法：从JWT中获取companyId
@Get()
async getEmployees(@CurrentUser() user: JwtPayload) {
  const companyId = user.companyId; // 来自已验证的JWT
  return this.employeeService.findAll(companyId);
}
```

### 7.2 防止Session劫持

```typescript
// JWT中包含额外的安全信息
interface JWTPayload {
  sub: string;
  address: string;
  companyId: string;
  // 安全字段
  ip: string; // 登录IP
  userAgent: string; // 浏览器标识
  jti: string; // JWT唯一ID，用于撤销
}

// 验证时检查这些字段
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JWTPayload, req: Request) {
    // 检查IP是否变化（可选，根据业务需求）
    if (payload.ip !== req.ip) {
      // 可能的Session劫持，要求重新登录
      throw new UnauthorizedException('Session安全验证失败');
    }

    return payload;
  }
}
```

---

## 八、数据库Schema设计

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  ens_name VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  last_selected_company_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 组织表
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(42) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 组织成员关系表
CREATE TABLE company_members (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'member'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'removed'
  joined_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, user_id)
);

-- Session表（可选，用于管理活跃Session）
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  jwt_id VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_sessions (user_id, expires_at),
  INDEX idx_jwt_id (jwt_id)
);
```

---

## 九、测试用例

### 9.1 E2E测试

```typescript
// test/auth-workflow.e2e-spec.ts
describe('Auth Workflow (e2e)', () => {
  it('完整登录流程：单个组织', async () => {
    // 1. 获取签名消息
    const { body: msgResponse } = await request(app.getHttpServer())
      .post('/enterprise/auth/message')
      .send({ address: testAddress, chainId: 1 })
      .expect(200);

    // 2. 模拟签名并登录
    const signature = await signMessage(msgResponse.message);
    const { body: loginResponse } = await request(app.getHttpServer())
      .post('/enterprise/auth/login')
      .send({ message: msgResponse.message, signature, address: testAddress })
      .expect(200);

    expect(loginResponse.user.needsCompanySelection).toBe(true);
    const token = loginResponse.accessToken;

    // 3. 获取可用组织
    const { body: companiesResponse } = await request(app.getHttpServer())
      .get('/enterprise/companies/available')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(companiesResponse.companies).toHaveLength(1);

    // 4. 选择组织
    const { body: selectResponse } = await request(app.getHttpServer())
      .post('/enterprise/session/select-company')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId: companiesResponse.companies[0].id })
      .expect(200);

    expect(selectResponse.company.id).toBe(companiesResponse.companies[0].id);
    const companyToken = selectResponse.accessToken;

    // 5. 使用带组织上下文的Token访问资源
    await request(app.getHttpServer())
      .get(`/enterprise/companies/${companiesResponse.companies[0].id}/dashboard`)
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(200);
  });

  it('新用户流程：创建组织', async () => {
    // ... 登录步骤同上

    // 3. 获取可用组织 - 应该为空
    const { body: companiesResponse } = await request(app.getHttpServer())
      .get('/enterprise/companies/available')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(companiesResponse.companies).toHaveLength(0);

    // 4. 创建新组织
    const { body: newCompany } = await request(app.getHttpServer())
      .post('/enterprise/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '测试公司' })
      .expect(201);

    expect(newCompany.role).toBe('owner');

    // 5. 选择新创建的组织
    const { body: selectResponse } = await request(app.getHttpServer())
      .post('/enterprise/session/select-company')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId: newCompany.id })
      .expect(200);

    expect(selectResponse.company.id).toBe(newCompany.id);
  });
});
```

---

## 十、总结

### 关键要点

1. **两阶段Token**：
   - 第一阶段：无组织上下文的Token（用于选择组织）
   - 第二阶段：包含组织上下文的Token（用于访问资源）

2. **自动化逻辑**：
   - 0个组织 → 引导创建
   - 1个组织 → 自动选择
   - 多个组织 → 显示选择界面（可基于历史记录推荐）

3. **安全验证**：
   - JWT中的companyId必须与URL参数匹配
   - 每次请求都验证用户的组织成员资格
   - 防止Token伪造和Session劫持

4. **用户体验**：
   - 记住用户上次选择的组织
   - 支持快速切换组织
   - 清晰的状态提示

### 未来优化方向

1. **多组织并行工作**：支持在不同标签页中操作不同组织
2. **组织切换历史**：记录用户的组织切换行为
3. **智能推荐**：根据使用频率推荐默认组织
4. **离线支持**：缓存组织列表，减少网络请求
