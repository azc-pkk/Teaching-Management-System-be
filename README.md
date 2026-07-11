# Teaching Management System Backend

教学过程管理系统的数据库与Prisma基础工程，当前包含：

- Prisma ORM 7.8.0
- MySQL 9.7.0数据模型
- 18张业务表及完整迁移历史
- 8类测试账号
- 400条以上可重复执行的seed测试数据
- Prisma Studio数据库查看入口

> 当前仓库提供数据库层和Prisma Client，尚未包含正式Node.js HTTP服务。

## 环境要求

- Node.js LTS
- npm 11或更高版本
- MySQL 9.7.0
- Git

## 首次运行

### 1. 克隆数据库开发分支

```powershell
git clone -b codex/database-prisma-seed https://github.com/azc-pkk/Teaching-Management-System-be.git
cd Teaching-Management-System-be
```

### 2. 安装依赖

```powershell
npm install
```

### 3. 创建本地数据库

先确保MySQL服务已经启动，然后登录MySQL：

```powershell
mysql -u root -p
```

执行：

```sql
CREATE DATABASE IF NOT EXISTS teaching_management
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

退出：

```sql
exit;
```

### 4. 配置环境变量

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，将 `YOUR_URL_ENCODED_PASSWORD` 替换为自己的MySQL密码。密码中的特殊符号需要URL编码，例如：

```text
@ → %40
# → %23
! → %21
```

不要提交 `.env`。

### 5. 一键初始化数据库

```powershell
npm run db:setup
```

该命令会依次：

1. 应用所有数据库迁移；
2. 生成Prisma Client；
3. 写入400条以上测试数据。

脚本使用 `upsert` 和存在性检查，可重复运行。

### 6. 打开Prisma Studio

```powershell
npm run db:studio
```

浏览器打开后即可查看和编辑本地测试数据。

## 测试账号

| 用户名 | 角色 |
| --- | --- |
| `admin` | 系统管理员 |
| `academic_admin` | 教务处管理员 |
| `department_admin` | 系部管理员 |
| `research_director` | 教研室主任 |
| `teacher` | 教师 |
| `student` | 学生 |
| `textbook_admin` | 教材管理员 |
| `leader` | 学院领导 |

默认本地测试密码：

```text
TmsSeed#2026!
```

此密码只能用于本地开发，正式部署必须更换。

## 常用命令

```powershell
npm run db:migrate
npm run db:generate
npm run db:seed
npm run db:studio
```

## 数据模型

主要模块包括：

- 用户、教师、学生、部门、专业、班级
- 课程、教室、学期、考试
- 教材与教材征订
- 教室申请与调课申请
- 毕业审核
- 教学日志
- 审批记录与操作日志

用户启用状态使用：

```prisma
enabled Boolean @default(true)
```

## 常见问题

如果Windows提示Jiti缓存无权限，可在当前PowerShell中执行：

```powershell
$env:JITI_FS_CACHE="false"
```

然后重新运行对应的Prisma命令。
