import 'dotenv/config';

import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  ApprovalAction,
  ClassroomStatus,
  GraduationResult,
  PrismaClient,
  StudentStatus,
  TeachingLogStatus,
  TextbookOrderStatus,
  UserRole,
  WorkflowStatus,
} from '../generated/prisma/client.js';

// 从项目根目录的 .env 读取 MySQL 连接地址。
// 格式示例：mysql://用户名:URL编码后的密码@localhost:3306/数据库名
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('缺少 DATABASE_URL，请先配置项目根目录下的 .env');
}

// 将连接地址拆分为主机、端口、账号、密码和数据库名称。
const parsedUrl = new URL(databaseUrl);
const database = parsedUrl.pathname.replace(/^\//, '');

if (!database) {
  throw new Error('DATABASE_URL 中缺少数据库名称');
}

// Prisma 7 通过数据库驱动适配器连接 MySQL/MariaDB。
const adapter = new PrismaMariaDb({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 3306),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database,
  // Local MySQL 9.x commonly uses caching_sha2_password. Allow the connector
  // to retrieve the server RSA public key for password authentication.
  allowPublicKeyRetrieval: true,
  connectionLimit: 5,
});

// 整个脚本共用一个 Prisma Client，脚本结束时会主动断开连接。
const prisma = new PrismaClient({ adapter });

// .env 中的 SEED_DEFAULT_PASSWORD 优先；未配置时使用后面的默认测试密码。
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TmsSeed#2026!';

// 学号编码规则：年级4位 + 部门ID2位 + 专业ID2位 + 班级ID2位 + 班内号2位，共12位。

function studentNoPart(value: string | number, length: number, label: string) {
  const part = String(value);
  if (!/^\d+$/.test(part) || part.length > length) {
    throw new Error(`${label}必须是最多${length}位数字，当前值：${part}`);
  }
  return part.padStart(length, '0');
}

function buildStudentNo(
  grade: number,
  departmentId: number,
  majorId: number,
  classGroupId: number,
  withinClassNo: number,
) {
  return [
    studentNoPart(grade, 4, '年级'),
    studentNoPart(departmentId, 2, '部门ID'),
    studentNoPart(majorId, 2, '专业ID'),
    studentNoPart(classGroupId, 2, '班级ID'),
    studentNoPart(withinClassNo, 2, '班内号'),
  ].join('');
}

type SeedStudentInput = {
  legacyStudentNo: string;
  studentNo: string;
  name: string;
  classGroupId: number;
  grade: number;
  status: (typeof StudentStatus)[keyof typeof StudentStatus];
  phone: string;
};

// 优先更新新学号；若只找到旧 seed 学号，则原位改号，避免重复执行后产生两名学生。
async function upsertSeedStudent(input: SeedStudentInput) {
  const { legacyStudentNo, ...data } = input;
  const existing = await prisma.student.findUnique({ where: { studentNo: data.studentNo } });
  if (existing) {
    return prisma.student.update({ where: { id: existing.id }, data });
  }

  const legacy = await prisma.student.findUnique({ where: { studentNo: legacyStudentNo } });
  if (legacy) {
    return prisma.student.update({ where: { id: legacy.id }, data });
  }

  return prisma.student.create({ data });
}

// main 是 seed 的主流程入口；标记为 async 后，内部才能用 await 按顺序等待数据库操作完成。
async function main() {
  console.log('开始写入教学过程管理系统测试数据...');

  // 数据库不保存明文密码。每次执行 seed 都生成新盐值，最终格式为：
  // scrypt$盐值$哈希值；登录接口必须按同样的 scrypt 规则验证密码。
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = `scrypt$${passwordSalt}$${scryptSync(defaultPassword, passwordSalt, 64).toString('hex')}`;

  // 一、基础组织数据
  // 部门使用 code 作为业务唯一键。upsert 会在记录存在时更新，不存在时创建。
  const college = await prisma.department.upsert({
    where: { code: 'D001' },
    update: { name: '信息工程学院', type: 'COLLEGE' },
    create: { code: 'D001', name: '信息工程学院', type: 'COLLEGE' },
  });

  const computerDepartment = await prisma.department.upsert({
    where: { code: 'D002' },
    update: { name: '计算机系', type: 'DEPARTMENT', parentId: college.id },
    create: { code: 'D002', name: '计算机系', type: 'DEPARTMENT', parentId: college.id },
  });

  const softwareDepartment = await prisma.department.upsert({
    where: { code: 'D003' },
    update: { name: '软件工程系', type: 'DEPARTMENT', parentId: college.id },
    create: { code: 'D003', name: '软件工程系', type: 'DEPARTMENT', parentId: college.id },
  });


  // 二、教师数据
  // 教师通过 departmentId 关联部门，因此必须在部门写入完成后再创建。
  const teacher1 = await prisma.teacher.upsert({
    where: { employeeNo: 'T0001' },
    update: {
      name: '张伟',
      departmentId: computerDepartment.id,
      teacherType: '专任教师',
      title: '副教授',
      phone: '13800000001',
    },
    create: {
      employeeNo: 'T0001',
      name: '张伟',
      departmentId: computerDepartment.id,
      teacherType: '专任教师',
      title: '副教授',
      phone: '13800000001',
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { employeeNo: 'T0002' },
    update: {
      name: '李敏',
      departmentId: softwareDepartment.id,
      teacherType: '专任教师',
      title: '讲师',
      phone: '13800000002',
    },
    create: {
      employeeNo: 'T0002',
      name: '李敏',
      departmentId: softwareDepartment.id,
      teacherType: '专任教师',
      title: '讲师',
      phone: '13800000002',
    },
  });

  const teacher3 = await prisma.teacher.upsert({
    where: { employeeNo: 'T0003' },
    update: {
      name: '王强',
      departmentId: computerDepartment.id,
      teacherType: '外聘教师',
      title: '教授',
      phone: '13800000003',
    },
    create: {
      employeeNo: 'T0003',
      name: '王强',
      departmentId: computerDepartment.id,
      teacherType: '外聘教师',
      title: '教授',
      phone: '13800000003',
    },
  });

  const teacher4 = await prisma.teacher.upsert({
    where: { employeeNo: 'T0004' },
    update: {
      name: '赵敏',
      departmentId: softwareDepartment.id,
      teacherType: '专任教师',
      title: '副教授',
      phone: '13800000004',
    },
    create: {
      employeeNo: 'T0004',
      name: '赵敏',
      departmentId: softwareDepartment.id,
      teacherType: '专任教师',
      title: '副教授',
      phone: '13800000004',
    },
  });

  const teacher5 = await prisma.teacher.upsert({
    where: { employeeNo: 'T0005' },
    update: {
      name: '陈华',
      departmentId: college.id,
      teacherType: '管理人员',
      title: '教授',
      phone: '13800000005',
    },
    create: {
      employeeNo: 'T0005',
      name: '陈华',
      departmentId: college.id,
      teacherType: '管理人员',
      title: '教授',
      phone: '13800000005',
    },
  });

  // 教师创建并取得 id 后，再反向设置部门负责人，避免外键引用尚不存在的教师。
  await Promise.all([
    prisma.department.update({ where: { id: college.id }, data: { managerId: teacher5.id } }),
    prisma.department.update({ where: { id: computerDepartment.id }, data: { managerId: teacher1.id } }),
    prisma.department.update({ where: { id: softwareDepartment.id }, data: { managerId: teacher2.id } }),
  ]);


  // 三、专业和班级数据
  // 专业依赖所属部门；班级继续依赖专业、部门和担任辅导员的教师。
  const computerMajor = await prisma.major.upsert({
    where: { code: 'CS' },
    update: { name: '计算机科学与技术', departmentId: computerDepartment.id, durationYears: 4 },
    create: { code: 'CS', name: '计算机科学与技术', departmentId: computerDepartment.id, durationYears: 4 },
  });

  const softwareMajor = await prisma.major.upsert({
    where: { code: 'SE' },
    update: { name: '软件工程', departmentId: softwareDepartment.id, durationYears: 4 },
    create: { code: 'SE', name: '软件工程', departmentId: softwareDepartment.id, durationYears: 4 },
  });

  // ClassGroup 的班级名称没有直接用于 upsert 的唯一约束，因此先查询再更新或创建。
  const computerClassExisting = await prisma.classGroup.findFirst({ where: { name: '计算机2301班' } });
  const computerClass = computerClassExisting
    ? await prisma.classGroup.update({
        where: { id: computerClassExisting.id },
        data: {
          grade: 2023,
          majorId: computerMajor.id,
          departmentId: computerDepartment.id,
          counselorId: teacher1.id,
          studentCount: 3,
        },
      })
    : await prisma.classGroup.create({
        data: {
          name: '计算机2301班',
          grade: 2023,
          majorId: computerMajor.id,
          departmentId: computerDepartment.id,
          counselorId: teacher1.id,
          studentCount: 3,
        },
      });

  const softwareClassExisting = await prisma.classGroup.findFirst({ where: { name: '软件工程2301班' } });
  const softwareClass = softwareClassExisting
    ? await prisma.classGroup.update({
        where: { id: softwareClassExisting.id },
        data: {
          grade: 2023,
          majorId: softwareMajor.id,
          departmentId: softwareDepartment.id,
          counselorId: teacher2.id,
          studentCount: 3,
        },
      })
    : await prisma.classGroup.create({
        data: {
          name: '软件工程2301班',
          grade: 2023,
          majorId: softwareMajor.id,
          departmentId: softwareDepartment.id,
          counselorId: teacher2.id,
          studentCount: 3,
        },
      });


  // 四、基础学生数据
  // 学号采用“年级4位 + 学院2位 + 专业2位 + 班级2位 + 班内号2位”的12位格式。
  const students = await Promise.all([
    upsertSeedStudent({
      legacyStudentNo: '20230001',
      studentNo: buildStudentNo(2023, computerClass.departmentId, computerClass.majorId, computerClass.id, 1),
      name: '测试学生001', classGroupId: computerClass.id, grade: 2023, status: StudentStatus.ENROLLED, phone: '13900000001',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230002',
      studentNo: buildStudentNo(2023, computerClass.departmentId, computerClass.majorId, computerClass.id, 2),
      name: '测试学生002', classGroupId: computerClass.id, grade: 2023, status: StudentStatus.ENROLLED, phone: '13900000002',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230003',
      studentNo: buildStudentNo(2023, computerClass.departmentId, computerClass.majorId, computerClass.id, 3),
      name: '测试学生003', classGroupId: computerClass.id, grade: 2023, status: StudentStatus.SUSPENDED, phone: '13900000003',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230004',
      studentNo: buildStudentNo(2023, softwareClass.departmentId, softwareClass.majorId, softwareClass.id, 1),
      name: '测试学生004', classGroupId: softwareClass.id, grade: 2023, status: StudentStatus.ENROLLED, phone: '13900000004',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230005',
      studentNo: buildStudentNo(2023, softwareClass.departmentId, softwareClass.majorId, softwareClass.id, 2),
      name: '测试学生005', classGroupId: softwareClass.id, grade: 2023, status: StudentStatus.ENROLLED, phone: '13900000005',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230006',
      studentNo: buildStudentNo(2023, softwareClass.departmentId, softwareClass.majorId, softwareClass.id, 3),
      name: '测试学生006', classGroupId: softwareClass.id, grade: 2023, status: StudentStatus.GRADUATED, phone: '13900000006',
    }),
  ]);


  // 五、系统登录账号
  // 账号保存角色和密码哈希；部分账号还通过 teacherId 或 studentId 关联教师/学生资料。
  const userInputs = [
    { username: 'admin', name: '系统管理员', role: UserRole.ADMIN },
    { username: 'academic_admin', name: '教务处管理员', role: UserRole.ACADEMIC },
    { username: 'department_admin', name: '系部管理员', role: UserRole.DEPARTMENT_ADMIN, teacherId: teacher1.id },
    { username: 'research_director', name: '教研室主任', role: UserRole.RESEARCH_DIRECTOR, teacherId: teacher2.id },
    { username: 'teacher', name: '授课教师', role: UserRole.TEACHER, teacherId: teacher3.id },
    { username: 'student', name: '在校学生', role: UserRole.STUDENT, studentId: students[0]!.id },
    { username: 'textbook_admin', name: '教材管理员', role: UserRole.TEXTBOOK_ADMIN },
    { username: 'leader', name: '学院领导', role: UserRole.LEADER, teacherId: teacher5.id },
  ] as const;

  const users = [];
  for (const input of userInputs) {
    // 以 username 为唯一键。重新执行 seed 会同步更新密码、角色、启用状态和人员关联。
    users.push(
      await prisma.user.upsert({
        where: { username: input.username },
        update: {
          passwordHash,
          name: input.name,
          role: input.role,
          enabled: true,
          teacherId: 'teacherId' in input ? input.teacherId : null,
          studentId: 'studentId' in input ? input.studentId : null,
        },
        create: {
          username: input.username,
          passwordHash,
          name: input.name,
          role: input.role,
          enabled: true,
          teacherId: 'teacherId' in input ? input.teacherId : null,
          studentId: 'studentId' in input ? input.studentId : null,
        },
      }),
    );
  }

  // 当前 schema 只有 semesterId 字段，没有单独的 Semester 实体，因此暂用固定测试学期编号。
  // 将来增加 Semester 表后，应先创建学期，再改用真实的 semester.id。
  const semesterId = 1;

  // 六、核心业务样例
  // 先写入教室、课程、考试和教材，再创建依赖它们的申请、审核和教学日志。
  const classroom1 = await prisma.classroom.upsert({
    where: { roomNo: 'A101' },
    update: { campus: '主校区', building: '第一教学楼', type: '多媒体教室', capacity: 60, area: 85, status: ClassroomStatus.AVAILABLE },
    create: { roomNo: 'A101', campus: '主校区', building: '第一教学楼', type: '多媒体教室', capacity: 60, area: 85, status: ClassroomStatus.AVAILABLE },
  });

  const classroom2 = await prisma.classroom.upsert({
    where: { roomNo: 'A102' },
    update: { campus: '主校区', building: '第一教学楼', type: '普通教室', capacity: 45, area: 70, status: ClassroomStatus.AVAILABLE },
    create: { roomNo: 'A102', campus: '主校区', building: '第一教学楼', type: '普通教室', capacity: 45, area: 70, status: ClassroomStatus.AVAILABLE },
  });

  await prisma.classroom.upsert({
    where: { roomNo: 'B201' },
    update: { campus: '主校区', building: '实验楼', type: '计算机实验室', capacity: 50, area: 100, status: ClassroomStatus.MAINTENANCE },
    create: { roomNo: 'B201', campus: '主校区', building: '实验楼', type: '计算机实验室', capacity: 50, area: 100, status: ClassroomStatus.MAINTENANCE },
  });

  const course1 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: { name: '程序设计基础', credits: 3, courseType: '必修', departmentId: computerDepartment.id, directorId: teacher1.id },
    create: { code: 'CS101', name: '程序设计基础', credits: 3, courseType: '必修', departmentId: computerDepartment.id, directorId: teacher1.id },
  });

  const course2 = await prisma.course.upsert({
    where: { code: 'CS102' },
    update: { name: '数据库原理', credits: 3.5, courseType: '必修', departmentId: computerDepartment.id, directorId: teacher2.id },
    create: { code: 'CS102', name: '数据库原理', credits: 3.5, courseType: '必修', departmentId: computerDepartment.id, directorId: teacher2.id },
  });

  const course3 = await prisma.course.upsert({
    where: { code: 'SE201' },
    update: { name: '软件测试', credits: 2, courseType: '专业选修', departmentId: softwareDepartment.id, directorId: teacher4.id },
    create: { code: 'SE201', name: '软件测试', credits: 2, courseType: '专业选修', departmentId: softwareDepartment.id, directorId: teacher4.id },
  });

  const examStart = new Date('2026-07-01T09:00:00+08:00');
  const existingExam = await prisma.exam.findFirst({
    where: { semesterId, courseId: course1.id, classGroupId: computerClass.id, startTime: examStart },
  });
  const exam = existingExam
    ? await prisma.exam.update({
        where: { id: existingExam.id },
        data: { classroomId: classroom1.id, endTime: new Date('2026-07-01T11:00:00+08:00'), invigilatorId: teacher3.id },
      })
    : await prisma.exam.create({
        data: {
          semesterId,
          courseId: course1.id,
          classGroupId: computerClass.id,
          classroomId: classroom1.id,
          startTime: examStart,
          endTime: new Date('2026-07-01T11:00:00+08:00'),
          invigilatorId: teacher3.id,
        },
      });

  const textbook1 = await prisma.textbook.upsert({
    where: { isbn: '9787300000001' },
    update: { name: '程序设计基础教程', author: '张伟', publisher: '示例大学出版社', price: 49.8 },
    create: { isbn: '9787300000001', name: '程序设计基础教程', author: '张伟', publisher: '示例大学出版社', price: 49.8 },
  });

  const textbook2 = await prisma.textbook.upsert({
    where: { isbn: '9787300000002' },
    update: { name: '数据库系统原理', author: '李敏', publisher: '示例大学出版社', price: 58 },
    create: { isbn: '9787300000002', name: '数据库系统原理', author: '李敏', publisher: '示例大学出版社', price: 58 },
  });

  // 部分业务表缺少合适的唯一约束，使用 findFirst + update/create 实现可重复写入。
  const existingOrder = await prisma.textbookOrder.findFirst({
    where: { semesterId, courseId: course1.id, textbookId: textbook1.id },
  });
  if (existingOrder) {
    await prisma.textbookOrder.update({ where: { id: existingOrder.id }, data: { quantity: 60, status: TextbookOrderStatus.APPROVED } });
  } else {
    await prisma.textbookOrder.create({ data: { semesterId, courseId: course1.id, textbookId: textbook1.id, quantity: 60, status: TextbookOrderStatus.APPROVED } });
  }

  const existingOrder2 = await prisma.textbookOrder.findFirst({
    where: { semesterId, courseId: course2.id, textbookId: textbook2.id },
  });
  if (existingOrder2) {
    await prisma.textbookOrder.update({ where: { id: existingOrder2.id }, data: { quantity: 45, status: TextbookOrderStatus.PENDING } });
  } else {
    await prisma.textbookOrder.create({ data: { semesterId, courseId: course2.id, textbookId: textbook2.id, quantity: 45, status: TextbookOrderStatus.PENDING } });
  }

  const requestStart = new Date('2026-06-20T14:00:00+08:00');
  const existingRequest = await prisma.classroomRequest.findFirst({
    where: { applicantId: users[4]!.id, classroomId: classroom2.id, startTime: requestStart },
  });
  const classroomRequest = existingRequest
    ? await prisma.classroomRequest.update({
        where: { id: existingRequest.id },
        data: { endTime: new Date('2026-06-20T16:00:00+08:00'), purpose: '课程答疑', status: WorkflowStatus.APPROVED },
      })
    : await prisma.classroomRequest.create({
        data: { applicantId: users[4]!.id, classroomId: classroom2.id, startTime: requestStart, endTime: new Date('2026-06-20T16:00:00+08:00'), purpose: '课程答疑', status: WorkflowStatus.APPROVED },
      });

  const existingChange = await prisma.scheduleChange.findFirst({
    where: { teacherId: teacher3.id, courseId: course1.id, classGroupId: computerClass.id, reason: '参加教学研讨会' },
  });
  const scheduleChange = existingChange
    ? await prisma.scheduleChange.update({ where: { id: existingChange.id }, data: { hours: 2, status: WorkflowStatus.PENDING } })
    : await prisma.scheduleChange.create({ data: { teacherId: teacher3.id, courseId: course1.id, classGroupId: computerClass.id, hours: 2, reason: '参加教学研讨会', status: WorkflowStatus.PENDING } });

  await prisma.graduationReview.upsert({
    where: { studentId_semesterId: { studentId: students[5]!.id, semesterId } },
    update: { totalCredits: 132, hasFailedRequiredCourse: false, result: GraduationResult.PASSED },
    create: { studentId: students[5]!.id, semesterId, totalCredits: 132, hasFailedRequiredCourse: false, result: GraduationResult.PASSED },
  });

  await prisma.graduationReview.upsert({
    where: { studentId_semesterId: { studentId: students[1]!.id, semesterId } },
    update: { totalCredits: 116, hasFailedRequiredCourse: true, result: GraduationResult.REVIEW_REQUIRED },
    create: { studentId: students[1]!.id, semesterId, totalCredits: 116, hasFailedRequiredCourse: true, result: GraduationResult.REVIEW_REQUIRED },
  });

  const lessonDate = new Date('2026-06-10T00:00:00+08:00');
  const existingLog = await prisma.teachingLog.findFirst({
    where: { teacherId: teacher3.id, courseId: course1.id, classGroupId: computerClass.id, lessonDate },
  });
  if (existingLog) {
    await prisma.teachingLog.update({ where: { id: existingLog.id }, data: { content: '数组与函数综合练习', attendanceSummary: '应到3人，实到3人', status: TeachingLogStatus.SUBMITTED } });
  } else {
    await prisma.teachingLog.create({ data: { teacherId: teacher3.id, courseId: course1.id, classGroupId: computerClass.id, lessonDate, content: '数组与函数综合练习', attendanceSummary: '应到3人，实到3人', status: TeachingLogStatus.SUBMITTED } });
  }

  const academicUser = users[1]!;
  // 审批记录用业务类型、业务记录、操作人和动作组合判断是否已经存在。
  const approvalInputs = [
    { businessType: 'CLASSROOM_REQUEST', businessId: classroomRequest.id, action: ApprovalAction.APPROVE, comment: '教室时间无冲突，同意申请' },
    { businessType: 'SCHEDULE_CHANGE', businessId: scheduleChange.id, action: ApprovalAction.SUBMIT, comment: '等待系部审核' },
    { businessType: 'EXAM', businessId: exam.id, action: ApprovalAction.APPROVE, comment: '考试安排审核通过' },
  ] as const;

  for (const input of approvalInputs) {
    const existing = await prisma.approvalRecord.findFirst({
      where: { businessType: input.businessType, businessId: input.businessId, operatorId: academicUser.id, action: input.action },
    });
    if (existing) {
      await prisma.approvalRecord.update({ where: { id: existing.id }, data: { comment: input.comment } });
    } else {
      await prisma.approvalRecord.create({ data: { ...input, operatorId: academicUser.id } });
    }
  }

  // 操作日志用于记录“谁在什么模块对哪条数据做了什么”，便于审计和问题追踪。
  const operationInputs = [
    { userId: users[0]!.id, module: 'SYSTEM', action: 'SEED_DATA', targetId: null },
    { userId: users[4]!.id, module: 'CLASSROOM_REQUEST', action: 'CREATE', targetId: classroomRequest.id },
    { userId: academicUser.id, module: 'EXAM', action: 'APPROVE', targetId: exam.id },
  ] as const;

  for (const input of operationInputs) {
    const existing = await prisma.operationLog.findFirst({ where: { ...input } });
    if (!existing) {
      await prisma.operationLog.create({ data: input });
    }
  }

  // 七、批量场景数据
  // 用于分页、筛选、统计、审批流和边界测试；数据按序号规律生成，方便稳定复现。
  // 先补充批量教师，后续课程、考试、调课和教学日志会循环引用这些教师。
  const allTeachers = [teacher1, teacher2, teacher3, teacher4, teacher5];
  for (let index = 6; index <= 12; index += 1) {
    const employeeNo = `T${String(index).padStart(4, '0')}`;
    const department = index % 2 === 0 ? computerDepartment : softwareDepartment;
    const teacher = await prisma.teacher.upsert({
      where: { employeeNo },
      update: {
        name: `批量教师${String(index).padStart(2, '0')}`,
        departmentId: department.id,
        teacherType: index % 3 === 0 ? '外聘教师' : '专任教师',
        title: index % 2 === 0 ? '讲师' : '副教授',
        phone: `1381000${String(index).padStart(4, '0')}`,
      },
      create: {
        employeeNo,
        name: `批量教师${String(index).padStart(2, '0')}`,
        departmentId: department.id,
        teacherType: index % 3 === 0 ? '外聘教师' : '专任教师',
        title: index % 2 === 0 ? '讲师' : '副教授',
        phone: `1381000${String(index).padStart(4, '0')}`,
      },
    });
    allTeachers.push(teacher);
  }

  // 增加多个测试班级，使学生分页、班级筛选和跨班级统计具有足够样本。
  const extraClassSpecs = [
    { name: '计算机2302班', grade: 2023, majorId: computerMajor.id, departmentId: computerDepartment.id, counselorId: teacher3.id },
    { name: '软件工程2302班', grade: 2023, majorId: softwareMajor.id, departmentId: softwareDepartment.id, counselorId: teacher4.id },
    { name: '计算机2401班', grade: 2024, majorId: computerMajor.id, departmentId: computerDepartment.id, counselorId: allTeachers[5]!.id },
    { name: '软件工程2401班', grade: 2024, majorId: softwareMajor.id, departmentId: softwareDepartment.id, counselorId: allTeachers[6]!.id },
  ];
  const extraClassGroups = [];
  for (const spec of extraClassSpecs) {
    const existing = await prisma.classGroup.findFirst({ where: { name: spec.name } });
    extraClassGroups.push(
      existing
        ? await prisma.classGroup.update({ where: { id: existing.id }, data: { ...spec, studentCount: 0 } })
        : await prisma.classGroup.create({ data: { ...spec, studentCount: 0 } }),
    );
  }
  const allClassGroups = [computerClass, softwareClass, ...extraClassGroups];

  // 生成 120 名学生，平均分配到4个批量班级，每班30人。
  const bulkStudentClassSpecs = [
    { classGroup: extraClassGroups[0]! },
    { classGroup: extraClassGroups[1]! },
    { classGroup: extraClassGroups[2]! },
    { classGroup: extraClassGroups[3]! },
  ];
  const bulkStudents = [];
  for (let index = 1; index <= 120; index += 1) {
    const classSpec = bulkStudentClassSpecs[(index - 1) % bulkStudentClassSpecs.length]!;
    const withinClassNo = Math.floor((index - 1) / bulkStudentClassSpecs.length) + 1;
    const studentNo = buildStudentNo(
      classSpec.classGroup.grade,
      classSpec.classGroup.departmentId,
      classSpec.classGroup.majorId,
      classSpec.classGroup.id,
      withinClassNo,
    );
    const status = index % 40 === 0
      ? StudentStatus.WITHDRAWN
      : index % 25 === 0
        ? StudentStatus.SUSPENDED
        : StudentStatus.ENROLLED;
    bulkStudents.push(
      await upsertSeedStudent({
        legacyStudentNo: `2024${String(index).padStart(4, '0')}`,
        studentNo,
        name: `批量测试学生${String(index).padStart(3, '0')}`,
        classGroupId: classSpec.classGroup.id,
        grade: classSpec.classGroup.grade,
        status,
        phone: `1391000${String(index).padStart(4, '0')}`,
      }),
    );
  }
  // 学生写入完成后重新统计每个班的实际人数，保证 studentCount 与学生表一致。
  for (const classGroup of allClassGroups) {
    const studentCount = await prisma.student.count({ where: { classGroupId: classGroup.id } });
    await prisma.classGroup.update({ where: { id: classGroup.id }, data: { studentCount } });
  }

  // 批量课程、教室和教材分别以课程编码、教室号和 ISBN 作为稳定的业务唯一键。
  const bulkCourses = [];
  for (let index = 1; index <= 15; index += 1) {
    const code = `TEST${String(index).padStart(3, '0')}`;
    const department = index % 2 === 0 ? computerDepartment : softwareDepartment;
    const director = allTeachers[(index - 1) % allTeachers.length]!;
    bulkCourses.push(
      await prisma.course.upsert({
        where: { code },
        update: {
          name: `测试课程${String(index).padStart(2, '0')}`,
          credits: 1 + (index % 4) * 0.5,
          courseType: index % 3 === 0 ? '选修' : '必修',
          departmentId: department.id,
          directorId: director.id,
        },
        create: {
          code,
          name: `测试课程${String(index).padStart(2, '0')}`,
          credits: 1 + (index % 4) * 0.5,
          courseType: index % 3 === 0 ? '选修' : '必修',
          departmentId: department.id,
          directorId: director.id,
        },
      }),
    );
  }

  // 批量教室包含可用和维护中状态，用于容量、校区、类型及状态筛选测试。
  const bulkClassrooms = [];
  for (let index = 1; index <= 12; index += 1) {
    const roomNo = `C${String(300 + index)}`;
    bulkClassrooms.push(
      await prisma.classroom.upsert({
        where: { roomNo },
        update: {
          campus: index % 2 === 0 ? '主校区' : '新校区',
          building: '测试教学楼',
          type: index % 3 === 0 ? '计算机实验室' : '多媒体教室',
          capacity: 30 + index * 5,
          area: 60 + index * 4,
          status: index % 6 === 0 ? ClassroomStatus.MAINTENANCE : ClassroomStatus.AVAILABLE,
        },
        create: {
          roomNo,
          campus: index % 2 === 0 ? '主校区' : '新校区',
          building: '测试教学楼',
          type: index % 3 === 0 ? '计算机实验室' : '多媒体教室',
          capacity: 30 + index * 5,
          area: 60 + index * 4,
          status: index % 6 === 0 ? ClassroomStatus.MAINTENANCE : ClassroomStatus.AVAILABLE,
        },
      }),
    );
  }

  // 批量教材使用稳定 ISBN，重复执行时只会更新同一本教材，不会持续增加重复记录。
  const bulkTextbooks = [];
  for (let index = 1; index <= 10; index += 1) {
    const isbn = `9787000${String(index).padStart(6, '0')}`;
    bulkTextbooks.push(
      await prisma.textbook.upsert({
        where: { isbn },
        update: { name: `测试教材${String(index).padStart(2, '0')}`, author: `测试作者${index}`, publisher: '测试教育出版社', price: 35 + index * 2.5 },
        create: { isbn, name: `测试教材${String(index).padStart(2, '0')}`, author: `测试作者${index}`, publisher: '测试教育出版社', price: 35 + index * 2.5 },
      }),
    );
  }

  // 考试按“学期 + 课程 + 班级 + 开始时间”查重，避免重复执行时产生相同考试。
  const bulkExams = [];
  for (let index = 1; index <= 18; index += 1) {
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const classroom = bulkClassrooms[(index - 1) % bulkClassrooms.length]!;
    const invigilator = allTeachers[index % allTeachers.length]!;
    const startTime = new Date(Date.UTC(2026, 5, 1 + index, 1, 0, 0));
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const existing = await prisma.exam.findFirst({
      where: { semesterId, courseId: course.id, classGroupId: classGroup.id, startTime },
    });
    bulkExams.push(
      existing
        ? await prisma.exam.update({ where: { id: existing.id }, data: { classroomId: classroom.id, endTime, invigilatorId: invigilator.id } })
        : await prisma.exam.create({ data: { semesterId, courseId: course.id, classGroupId: classGroup.id, classroomId: classroom.id, startTime, endTime, invigilatorId: invigilator.id } }),
    );
  }

  for (let index = 1; index <= 18; index += 1) {
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const textbook = bulkTextbooks[(index - 1) % bulkTextbooks.length]!;
    const existing = await prisma.textbookOrder.findFirst({
      where: { semesterId, courseId: course.id, textbookId: textbook.id },
    });
    const data = {
      quantity: 30 + index * 2,
      status: index % 4 === 0 ? TextbookOrderStatus.RECEIVED : index % 3 === 0 ? TextbookOrderStatus.APPROVED : TextbookOrderStatus.PENDING,
    };
    if (existing) {
      await prisma.textbookOrder.update({ where: { id: existing.id }, data });
    } else {
      await prisma.textbookOrder.create({ data: { semesterId, courseId: course.id, textbookId: textbook.id, ...data } });
    }
  }

  // 批量生成已通过和已拒绝的教室申请，用于审批状态筛选测试。
  const bulkRequests = [];
  for (let index = 1; index <= 20; index += 1) {
    const applicant = users[4 + (index % 2)]!;
    const classroom = bulkClassrooms[(index - 1) % bulkClassrooms.length]!;
    const startTime = new Date(Date.UTC(2026, 3, 1 + index, 6, 0, 0));
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const existing = await prisma.classroomRequest.findFirst({
      where: { applicantId: applicant.id, classroomId: classroom.id, startTime },
    });
    bulkRequests.push(
      existing
        ? await prisma.classroomRequest.update({ where: { id: existing.id }, data: { endTime, purpose: `批量教室申请${index}`, status: index % 4 === 0 ? WorkflowStatus.REJECTED : WorkflowStatus.APPROVED } })
        : await prisma.classroomRequest.create({ data: { applicantId: applicant.id, classroomId: classroom.id, startTime, endTime, purpose: `批量教室申请${index}`, status: index % 4 === 0 ? WorkflowStatus.REJECTED : WorkflowStatus.APPROVED } }),
    );
  }

  // 批量生成待审批和已拒绝的调课记录，用于调课流程与权限测试。
  const bulkChanges = [];
  for (let index = 1; index <= 15; index += 1) {
    const teacher = allTeachers[(index - 1) % allTeachers.length]!;
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const reason = `批量调课测试原因${index}`;
    const existing = await prisma.scheduleChange.findFirst({
      where: { teacherId: teacher.id, courseId: course.id, classGroupId: classGroup.id, reason },
    });
    bulkChanges.push(
      existing
        ? await prisma.scheduleChange.update({ where: { id: existing.id }, data: { hours: 1 + (index % 4), status: index % 5 === 0 ? WorkflowStatus.REJECTED : WorkflowStatus.PENDING } })
        : await prisma.scheduleChange.create({ data: { teacherId: teacher.id, courseId: course.id, classGroupId: classGroup.id, hours: 1 + (index % 4), reason, status: index % 5 === 0 ? WorkflowStatus.REJECTED : WorkflowStatus.PENDING } }),
    );
  }

  // 生成毕业审核边界数据，覆盖审核通过、不通过和需要人工复核。
  for (let index = 0; index < 40; index += 1) {
    const student = bulkStudents[index]!;
    const hasFailedRequiredCourse = index % 7 === 0;
    const totalCredits = hasFailedRequiredCourse ? 110 + (index % 10) : 120 + (index % 18);
    const result = hasFailedRequiredCourse
      ? GraduationResult.REVIEW_REQUIRED
      : totalCredits >= 120
        ? GraduationResult.PASSED
        : GraduationResult.FAILED;
    await prisma.graduationReview.upsert({
      where: { studentId_semesterId: { studentId: student.id, semesterId } },
      update: { totalCredits, hasFailedRequiredCourse, result },
      create: { studentId: student.id, semesterId, totalCredits, hasFailedRequiredCourse, result },
    });
  }

  // 生成教师教学日志和出勤摘要，用于教师考勤、日志查询与统计测试。
  for (let index = 1; index <= 30; index += 1) {
    const teacher = allTeachers[(index - 1) % allTeachers.length]!;
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const bulkLessonDate = new Date(Date.UTC(2026, 2, 1 + index, 0, 0, 0));
    const existing = await prisma.teachingLog.findFirst({
      where: { teacherId: teacher.id, courseId: course.id, classGroupId: classGroup.id, lessonDate: bulkLessonDate },
    });
    const data = {
      content: `第${index}次批量教学日志：课堂教学与练习`,
      attendanceSummary: `应到${30 + (index % 20)}人，缺勤${index % 4}人`,
      status: index % 4 === 0 ? TeachingLogStatus.APPROVED : TeachingLogStatus.SUBMITTED,
    };
    if (existing) {
      await prisma.teachingLog.update({ where: { id: existing.id }, data });
    } else {
      await prisma.teachingLog.create({ data: { teacherId: teacher.id, courseId: course.id, classGroupId: classGroup.id, lessonDate: bulkLessonDate, ...data } });
    }
  }

  for (const request of bulkRequests) {
    const action = request.status === WorkflowStatus.REJECTED ? ApprovalAction.REJECT : ApprovalAction.APPROVE;
    const existing = await prisma.approvalRecord.findFirst({
      where: { businessType: 'CLASSROOM_REQUEST', businessId: request.id, operatorId: academicUser.id, action },
    });
    if (!existing) {
      await prisma.approvalRecord.create({ data: { businessType: 'CLASSROOM_REQUEST', businessId: request.id, operatorId: academicUser.id, action, comment: '批量审批测试记录' } });
    }
  }

  for (let index = 0; index < 25; index += 1) {
    const examRecord = bulkExams[index % bulkExams.length]!;
    const existing = await prisma.operationLog.findFirst({
      where: { userId: academicUser.id, module: 'EXAM', action: `BULK_TEST_${index + 1}`, targetId: examRecord.id },
    });
    if (!existing) {
      await prisma.operationLog.create({ data: { userId: academicUser.id, module: 'EXAM', action: `BULK_TEST_${index + 1}`, targetId: examRecord.id } });
    }
  }

  // 八、执行结果检查
  // 并行统计各表当前总记录数，确认测试数据规模满足分页和统计测试要求。
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.major.count(),
    prisma.classGroup.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.course.count(),
    prisma.classroom.count(),
    prisma.exam.count(),
    prisma.textbook.count(),
    prisma.textbookOrder.count(),
    prisma.classroomRequest.count(),
    prisma.scheduleChange.count(),
    prisma.graduationReview.count(),
    prisma.teachingLog.count(),
    prisma.approvalRecord.count(),
    prisma.operationLog.count(),
  ]);

  // 检查所有学生学号均为12位数字，并且学号各段与学生关联的班级资料一致。
  const studentNoRows = await prisma.student.findMany({
    select: {
      studentNo: true,
      grade: true,
      classGroup: { select: { departmentId: true, majorId: true, id: true, grade: true } },
    },
    orderBy: { studentNo: 'asc' },
  });
  const invalidStudentNos = studentNoRows.filter(({ studentNo, grade, classGroup }) =>
    !/^\d{12}$/.test(studentNo)
    || studentNo.slice(0, 4) !== String(grade)
    || studentNo.slice(4, 6) !== String(classGroup.departmentId).padStart(2, '0')
    || studentNo.slice(6, 8) !== String(classGroup.majorId).padStart(2, '0')
    || studentNo.slice(8, 10) !== String(classGroup.id).padStart(2, '0')
    || grade !== classGroup.grade,
  );
  if (invalidStudentNos.length > 0) {
    throw new Error(`发现${invalidStudentNos.length}个不符合4-2-2-2-2规则的学号：${invalidStudentNos.slice(0, 5).map((item) => item.studentNo).join('、')}`);
  }
  console.log(`学号格式检查通过：${studentNoRows.length}个学号均符合4-2-2-2-2规则。`);

  console.table({
    users: counts[0],
    departments: counts[1],
    majors: counts[2],
    classGroups: counts[3],
    teachers: counts[4],
    students: counts[5],
    courses: counts[6],
    classrooms: counts[7],
    exams: counts[8],
    textbooks: counts[9],
    textbookOrders: counts[10],
    classroomRequests: counts[11],
    scheduleChanges: counts[12],
    graduationReviews: counts[13],
    teachingLogs: counts[14],
    approvalRecords: counts[15],
    operationLogs: counts[16],
  });

  const totalRecords = counts.reduce((sum, count) => sum + count, 0);
  console.log(`Total seeded records across business tables: ${totalRecords}`);
  // 这里检查的是数据库当前总量，其中也包含 seed 执行前已经存在的数据。
  if (totalRecords < 200) {
    throw new Error(`Seed数据总量不足200条，当前只有${totalRecords}条`);
  }

  console.log('Seed执行完成。');
  console.log('测试账号：admin、academic_admin、department_admin、research_director、teacher、student、textbook_admin、leader');
  console.log(`默认测试密码：${defaultPassword}`);
}

// 启动 seed；发生异常时设置非零退出码，方便 PowerShell 或 CI 判断执行失败。
main()
  .catch((error: unknown) => {
    console.error('Seed执行失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 无论成功或失败都释放连接，避免 Node.js 进程持续占用数据库连接池。
    await prisma.$disconnect();
  });
