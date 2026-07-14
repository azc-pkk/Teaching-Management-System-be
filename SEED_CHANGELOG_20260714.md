# Seed 数据改动说明（2026-07-14）

## 变更范围

本次只调整 `prisma/seed.ts` 的测试数据生成逻辑，不修改 `schema.prisma`、Prisma migration、表结构、字段类型或角色枚举。

停用的 `prisma/seed.ts.old` 仅作为本地备份，不提交到远程仓库。

本次变更只提交到：

```text
feature/native-client-adapter
```

不会修改 `main` 或其他分支。

## 学号格式变化

旧版本使用 8 位测试学号，例如：

```text
20230001
20240001
```

新版本统一使用：

```text
年级4位 + 部门ID2位 + 专业ID2位 + 班级ID2位 + 班内序号2位
```

示例：

```text
202302010101
```

编码直接使用数据库中已有的 `department.id`、`major.id` 和 `class_group.id`，不再维护额外的编码表。

## Seed 逻辑变化

新增 `studentNoPart` 和 `buildStudentNo`，统一执行数字校验、长度校验、补零和学号生成。

基础学生增加旧学号兼容逻辑：重新执行 seed 时优先查找新学号，如果不存在则查找旧学号并原位更新，避免重复创建学生。

批量学生仍然保持 120 人，但改为：

- 分配到 4 个批量班级。
- 每个班级的班内序号从 `01` 开始递增。
- 部门、专业、班级字段从实际班级关联读取。
- 学生年级与所属班级年级一致。
- 保留在读、休学、退学等状态用于筛选测试。

## 学号一致性检查

Seed 完成学生写入后会检查：

- 学号是否为 12 位数字。
- 前 4 位是否等于学生年级。
- 第 5-6 位是否等于班级所属部门 ID。
- 第 7-8 位是否等于班级所属专业 ID。
- 第 9-10 位是否等于班级 ID。
- 学生年级是否与班级年级一致。

检查失败时 seed 会抛出错误，不会报告成功。

## 账号和激活规则

保留 8 个角色测试账号：

```text
admin、academic_admin、department_admin、research_director
teacher、student、textbook_admin、leader
```

当前只有 `student` 测试账号绑定学生资料并拥有密码，其余学生只存在于 `student` 表，等待后续注册激活。

`sys_user.enabled` 继续表示账号启用或停用，没有新增用户字段。

## 数据库重置验收

在 `teaching_management_git` 数据库执行：

```powershell
pnpm prisma migrate reset --force
pnpm prisma db seed
```

验收结果：

```text
用户：8
部门：3
专业：2
班级：6
教师：12
学生：126
课程：18
教室：15
考试：19
教材：12
教室申请：21
调课申请：16
毕业审核：42
教学日志：31
审批记录：23
操作日志：28
```

总业务记录数为 `402`，126 个学生学号全部符合 4-2-2-2-2 格式，学号与部门、专业、班级关联一致。

激活结果：

```text
已激活学生：1
未激活学生：125
```

## 对后续开发的影响

学生列表和详情接口可以直接使用真实关联：

```text
Student → ClassGroup → Department / Major
```

后续筛选可以使用 `grade`、`departmentId`、`majorId`、`classGroupId` 和 `status`，不必只依赖解析学号字符串。

原生端学生详情页可以显示真实的部门、专业、班级和激活状态。

## 注意事项

1. `prisma migrate reset --force` 只能用于本地测试数据库。
2. 如果部门、专业或班级 ID 超过 99，当前学号规则会主动报错。
3. 学号是永久标识，转专业或转班时不应自动修改学号。
4. 新增真实学生时，应先建立部门、专业、班级关联，再生成学号。
