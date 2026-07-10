# 教学过程管理系统后端

本仓库是教学过程管理系统的独立后端仓库，使用 `NestJS + TypeScript + PostgreSQL + Prisma`。前端代码位于 [Teaching-Management-System-fe](https://github.com/azc-pkk/Teaching-Management-System-fe)，两个仓库独立开发、独立提交、通过 Apifox 定义的 REST API 协作。

## 开发前必读

- [教学过程管理系统功能设计.md](./教学过程管理系统功能设计.md)
- Apifox 中的接口文档、公共模型、环境与测试用例
- 前端仓库 README 中的联调约定

## 本地启动

环境要求：Node.js 20 或更高版本、pnpm 10 或更高版本、Docker Desktop。

```bash
pnpm install
copy .env.example .env
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev
```

服务默认运行在 `http://localhost:3001`，健康检查地址为 `GET /api/health`。

## 目录说明

```text
prisma/                         数据模型与迁移
src/
  common/                       公共 DTO、枚举、守卫、过滤器
  config/                       环境变量与应用配置
  database/                     Prisma 数据访问基础设施
  modules/
    auth/                       登录与权限
    base-data/                  教师、学生、课程、教室等基础数据
    classroom-requests/         教室申请
    schedule-changes/           调课审批
    exams/                      考务管理
    textbooks/                  教材管理
    graduation/                 毕业相关
    teaching-logs/              教学日志
test/                           接口集成测试
```

每个业务模块后续按 `controller / service / repository / dto` 组织。业务规则写在 service，数据库访问集中到 repository，禁止在 controller 直接操作 Prisma。

## Apifox 协作

1. 新接口先在 Apifox 定义路径、参数、响应、错误码与 Mock。
2. 后端按文档实现，并保持统一的 `ApiResponse<T>` 返回格式。
3. 接口完成后在 Apifox 验证成功、参数错误、未登录和越权场景。
4. 字段或状态码变化时，先更新 Apifox，再通知前端调整。

本地环境建议配置：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:3001`
- API 基础地址：`http://localhost:3001/api`

## 提交前检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

每个功能使用独立分支开发，分支名建议为 `feature/模块-功能`。不要把 `.env`、数据库数据或 `node_modules` 提交到仓库。

## 当前状态

- 已搭建 NestJS、模块目录、统一类型和本地 PostgreSQL 基础框架。
- 下一步由后端工程师完善 Prisma schema、登录鉴权和基础数据 CRUD。
