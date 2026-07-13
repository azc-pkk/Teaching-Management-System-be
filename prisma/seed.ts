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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('缺少 DATABASE_URL，请先配置项目根目录下的 .env');
}

const parsedUrl = new URL(databaseUrl);
const database = parsedUrl.pathname.replace(/^\//, '');

if (!database) {
  throw new Error('DATABASE_URL 中缺少数据库名称');
}

const adapter = new PrismaMariaDb({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 3306),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database,
  allowPublicKeyRetrieval: true,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TmsSeed#2026!';
const seedCollegeCode = '01';

function studentNoPart(value: string | number, length: number, label: string) {
  const part = String(value);

  if (!/^\d+$/.test(part) || part.length > length) {
    throw new Error(`${label} must be at most ${length} digits: ${part}`);
  }

  return part.padStart(length, '0');
}

function buildStudentNo(
  grade: number,
  majorCode: string,
  classCode: string,
  withinClassNo: number,
) {
  return [
    studentNoPart(grade, 4, 'grade'),
    studentNoPart(seedCollegeCode, 2, 'collegeCode'),
    studentNoPart(majorCode, 2, 'majorCode'),
    studentNoPart(classCode, 2, 'classCode'),
    studentNoPart(withinClassNo, 2, 'withinClassNo'),
  ].join('');
}

type SeedStudentInput = {
  legacyStudentNo: string;
  studentNo: string;
  name: string;
  classGroupId: number;
  grade: number;
  status: StudentStatus;
  phone: string;
};

async function upsertSeedStudent(input: SeedStudentInput) {
  const { legacyStudentNo, ...data } = input;
  const existing = await prisma.student.findUnique({
    where: { studentNo: data.studentNo },
  });

  if (existing) {
    return updateSeedStudent(existing.id, legacyStudentNo, data);
  }

  const legacy = await prisma.student.findUnique({
    where: { studentNo: legacyStudentNo },
  });

  if (legacy) {
    return updateSeedStudent(legacy.id, legacyStudentNo, data);
  }

  return prisma.student.create({ data });
}

async function updateSeedStudent(
  studentId: number,
  legacyStudentNo: string,
  data: Omit<SeedStudentInput, 'legacyStudentNo'>,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { studentId },
      select: { id: true, username: true },
    });

    if (
      user &&
      (user.username === legacyStudentNo || user.username === data.studentNo)
    ) {
      const usernameOwner = await tx.user.findUnique({
        where: { username: data.studentNo },
        select: { id: true },
      });

      if (usernameOwner && usernameOwner.id !== user.id) {
        throw new Error(
          `Cannot migrate ${legacyStudentNo}: username ${data.studentNo} is already used`,
        );
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          username: data.studentNo,
          name: data.name,
        },
      });
    }

    return tx.student.update({ where: { id: studentId }, data });
  });
}

async function main() {
  console.log('开始写入教学过程管理系统测试数据...');

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = `scrypt$${passwordSalt}$${scryptSync(defaultPassword, passwordSalt, 64).toString('hex')}`;

  const college = await prisma.department.upsert({
    where: { code: 'D001' },
    update: { name: '信息工程学院', type: 'COLLEGE' },
    create: { code: 'D001', name: '信息工程学院', type: 'COLLEGE' },
  });

  const computerDepartment = await prisma.department.upsert({
    where: { code: 'D002' },
    update: { name: '计算机系', type: 'DEPARTMENT', parentId: college.id },
    create: {
      code: 'D002',
      name: '计算机系',
      type: 'DEPARTMENT',
      parentId: college.id,
    },
  });

  const softwareDepartment = await prisma.department.upsert({
    where: { code: 'D003' },
    update: { name: '软件工程系', type: 'DEPARTMENT', parentId: college.id },
    create: {
      code: 'D003',
      name: '软件工程系',
      type: 'DEPARTMENT',
      parentId: college.id,
    },
  });

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

  await Promise.all([
    prisma.department.update({
      where: { id: college.id },
      data: { managerId: teacher5.id },
    }),
    prisma.department.update({
      where: { id: computerDepartment.id },
      data: { managerId: teacher1.id },
    }),
    prisma.department.update({
      where: { id: softwareDepartment.id },
      data: { managerId: teacher2.id },
    }),
  ]);

  const computerMajor = await prisma.major.upsert({
    where: { code: 'CS' },
    update: {
      name: '计算机科学与技术',
      departmentId: computerDepartment.id,
      durationYears: 4,
    },
    create: {
      code: 'CS',
      name: '计算机科学与技术',
      departmentId: computerDepartment.id,
      durationYears: 4,
    },
  });

  const softwareMajor = await prisma.major.upsert({
    where: { code: 'SE' },
    update: {
      name: '软件工程',
      departmentId: softwareDepartment.id,
      durationYears: 4,
    },
    create: {
      code: 'SE',
      name: '软件工程',
      departmentId: softwareDepartment.id,
      durationYears: 4,
    },
  });

  const computerClassExisting = await prisma.classGroup.findFirst({
    where: { name: '计算机2301班' },
  });
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

  const softwareClassExisting = await prisma.classGroup.findFirst({
    where: { name: '软件工程2301班' },
  });
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

  const students = await Promise.all([
    upsertSeedStudent({
      legacyStudentNo: '20230001',
      studentNo: buildStudentNo(2023, '01', '01', 1),
      name: '测试学生001',
      classGroupId: computerClass.id,
      grade: 2023,
      status: StudentStatus.ENROLLED,
      phone: '13900000001',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230002',
      studentNo: buildStudentNo(2023, '01', '01', 2),
      name: '测试学生002',
      classGroupId: computerClass.id,
      grade: 2023,
      status: StudentStatus.ENROLLED,
      phone: '13900000002',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230003',
      studentNo: buildStudentNo(2023, '01', '01', 3),
      name: '测试学生003',
      classGroupId: computerClass.id,
      grade: 2023,
      status: StudentStatus.SUSPENDED,
      phone: '13900000003',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230004',
      studentNo: buildStudentNo(2023, '02', '01', 1),
      name: '测试学生004',
      classGroupId: softwareClass.id,
      grade: 2023,
      status: StudentStatus.ENROLLED,
      phone: '13900000004',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230005',
      studentNo: buildStudentNo(2023, '02', '01', 2),
      name: '测试学生005',
      classGroupId: softwareClass.id,
      grade: 2023,
      status: StudentStatus.ENROLLED,
      phone: '13900000005',
    }),
    upsertSeedStudent({
      legacyStudentNo: '20230006',
      studentNo: buildStudentNo(2023, '02', '01', 3),
      name: '测试学生006',
      classGroupId: softwareClass.id,
      grade: 2023,
      status: StudentStatus.GRADUATED,
      phone: '13900000006',
    }),
  ]);

  const userInputs = [
    { username: 'admin', name: '系统管理员', role: UserRole.ADMIN },
    {
      username: 'academic_admin',
      name: '教务处管理员',
      role: UserRole.ACADEMIC,
    },
    {
      username: 'department_admin',
      name: '系部管理员',
      role: UserRole.DEPARTMENT_ADMIN,
      teacherId: teacher1.id,
    },
    {
      username: 'research_director',
      name: '教研室主任',
      role: UserRole.RESEARCH_DIRECTOR,
      teacherId: teacher2.id,
    },
    {
      username: 'teacher',
      name: '授课教师',
      role: UserRole.TEACHER,
      teacherId: teacher3.id,
    },
    {
      username: 'student',
      name: '在校学生',
      role: UserRole.STUDENT,
      studentId: students[0]!.id,
    },
    {
      username: 'textbook_admin',
      name: '教材管理员',
      role: UserRole.TEXTBOOK_ADMIN,
    },
    {
      username: 'leader',
      name: '学院领导',
      role: UserRole.LEADER,
      teacherId: teacher5.id,
    },
  ] as const;

  const users = [];
  for (const input of userInputs) {
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

  // 图片仅定义semesterId，没有定义Semester实体，因此使用固定测试学期编号。
  const semesterId = 1;

  const classroom1 = await prisma.classroom.upsert({
    where: { roomNo: 'A101' },
    update: {
      campus: '主校区',
      building: '第一教学楼',
      type: '多媒体教室',
      capacity: 60,
      area: 85,
      status: ClassroomStatus.AVAILABLE,
    },
    create: {
      roomNo: 'A101',
      campus: '主校区',
      building: '第一教学楼',
      type: '多媒体教室',
      capacity: 60,
      area: 85,
      status: ClassroomStatus.AVAILABLE,
    },
  });

  const classroom2 = await prisma.classroom.upsert({
    where: { roomNo: 'A102' },
    update: {
      campus: '主校区',
      building: '第一教学楼',
      type: '普通教室',
      capacity: 45,
      area: 70,
      status: ClassroomStatus.AVAILABLE,
    },
    create: {
      roomNo: 'A102',
      campus: '主校区',
      building: '第一教学楼',
      type: '普通教室',
      capacity: 45,
      area: 70,
      status: ClassroomStatus.AVAILABLE,
    },
  });

  await prisma.classroom.upsert({
    where: { roomNo: 'B201' },
    update: {
      campus: '主校区',
      building: '实验楼',
      type: '计算机实验室',
      capacity: 50,
      area: 100,
      status: ClassroomStatus.MAINTENANCE,
    },
    create: {
      roomNo: 'B201',
      campus: '主校区',
      building: '实验楼',
      type: '计算机实验室',
      capacity: 50,
      area: 100,
      status: ClassroomStatus.MAINTENANCE,
    },
  });

  const course1 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {
      name: '程序设计基础',
      credits: 3,
      courseType: '必修',
      departmentId: computerDepartment.id,
      directorId: teacher1.id,
    },
    create: {
      code: 'CS101',
      name: '程序设计基础',
      credits: 3,
      courseType: '必修',
      departmentId: computerDepartment.id,
      directorId: teacher1.id,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: 'CS102' },
    update: {
      name: '数据库原理',
      credits: 3.5,
      courseType: '必修',
      departmentId: computerDepartment.id,
      directorId: teacher2.id,
    },
    create: {
      code: 'CS102',
      name: '数据库原理',
      credits: 3.5,
      courseType: '必修',
      departmentId: computerDepartment.id,
      directorId: teacher2.id,
    },
  });

  const course3 = await prisma.course.upsert({
    where: { code: 'SE201' },
    update: {
      name: '软件测试',
      credits: 2,
      courseType: '专业选修',
      departmentId: softwareDepartment.id,
      directorId: teacher4.id,
    },
    create: {
      code: 'SE201',
      name: '软件测试',
      credits: 2,
      courseType: '专业选修',
      departmentId: softwareDepartment.id,
      directorId: teacher4.id,
    },
  });

  const examStart = new Date('2026-07-01T09:00:00+08:00');
  const existingExam = await prisma.exam.findFirst({
    where: {
      semesterId,
      courseId: course1.id,
      classGroupId: computerClass.id,
      startTime: examStart,
    },
  });
  const exam = existingExam
    ? await prisma.exam.update({
        where: { id: existingExam.id },
        data: {
          classroomId: classroom1.id,
          endTime: new Date('2026-07-01T11:00:00+08:00'),
          invigilatorId: teacher3.id,
        },
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
    update: {
      name: '程序设计基础教程',
      author: '张伟',
      publisher: '示例大学出版社',
      price: 49.8,
    },
    create: {
      isbn: '9787300000001',
      name: '程序设计基础教程',
      author: '张伟',
      publisher: '示例大学出版社',
      price: 49.8,
    },
  });

  const textbook2 = await prisma.textbook.upsert({
    where: { isbn: '9787300000002' },
    update: {
      name: '数据库系统原理',
      author: '李敏',
      publisher: '示例大学出版社',
      price: 58,
    },
    create: {
      isbn: '9787300000002',
      name: '数据库系统原理',
      author: '李敏',
      publisher: '示例大学出版社',
      price: 58,
    },
  });

  const existingOrder = await prisma.textbookOrder.findFirst({
    where: { semesterId, courseId: course1.id, textbookId: textbook1.id },
  });
  if (existingOrder) {
    await prisma.textbookOrder.update({
      where: { id: existingOrder.id },
      data: { quantity: 60, status: TextbookOrderStatus.APPROVED },
    });
  } else {
    await prisma.textbookOrder.create({
      data: {
        semesterId,
        courseId: course1.id,
        textbookId: textbook1.id,
        quantity: 60,
        status: TextbookOrderStatus.APPROVED,
      },
    });
  }

  const existingOrder2 = await prisma.textbookOrder.findFirst({
    where: { semesterId, courseId: course2.id, textbookId: textbook2.id },
  });
  if (existingOrder2) {
    await prisma.textbookOrder.update({
      where: { id: existingOrder2.id },
      data: { quantity: 45, status: TextbookOrderStatus.PENDING },
    });
  } else {
    await prisma.textbookOrder.create({
      data: {
        semesterId,
        courseId: course2.id,
        textbookId: textbook2.id,
        quantity: 45,
        status: TextbookOrderStatus.PENDING,
      },
    });
  }

  const requestStart = new Date('2026-06-20T14:00:00+08:00');
  const existingRequest = await prisma.classroomRequest.findFirst({
    where: {
      applicantId: users[4]!.id,
      classroomId: classroom2.id,
      startTime: requestStart,
    },
  });
  const classroomRequest = existingRequest
    ? await prisma.classroomRequest.update({
        where: { id: existingRequest.id },
        data: {
          endTime: new Date('2026-06-20T16:00:00+08:00'),
          purpose: '课程答疑',
          status: WorkflowStatus.APPROVED,
        },
      })
    : await prisma.classroomRequest.create({
        data: {
          applicantId: users[4]!.id,
          classroomId: classroom2.id,
          startTime: requestStart,
          endTime: new Date('2026-06-20T16:00:00+08:00'),
          purpose: '课程答疑',
          status: WorkflowStatus.APPROVED,
        },
      });

  const existingChange = await prisma.scheduleChange.findFirst({
    where: {
      teacherId: teacher3.id,
      courseId: course1.id,
      classGroupId: computerClass.id,
      reason: '参加教学研讨会',
    },
  });
  const scheduleChange = existingChange
    ? await prisma.scheduleChange.update({
        where: { id: existingChange.id },
        data: { hours: 2, status: WorkflowStatus.PENDING },
      })
    : await prisma.scheduleChange.create({
        data: {
          teacherId: teacher3.id,
          courseId: course1.id,
          classGroupId: computerClass.id,
          hours: 2,
          reason: '参加教学研讨会',
          status: WorkflowStatus.PENDING,
        },
      });

  await prisma.graduationReview.upsert({
    where: { studentId_semesterId: { studentId: students[5]!.id, semesterId } },
    update: {
      totalCredits: 132,
      hasFailedRequiredCourse: false,
      result: GraduationResult.PASSED,
    },
    create: {
      studentId: students[5]!.id,
      semesterId,
      totalCredits: 132,
      hasFailedRequiredCourse: false,
      result: GraduationResult.PASSED,
    },
  });

  await prisma.graduationReview.upsert({
    where: { studentId_semesterId: { studentId: students[1]!.id, semesterId } },
    update: {
      totalCredits: 116,
      hasFailedRequiredCourse: true,
      result: GraduationResult.REVIEW_REQUIRED,
    },
    create: {
      studentId: students[1]!.id,
      semesterId,
      totalCredits: 116,
      hasFailedRequiredCourse: true,
      result: GraduationResult.REVIEW_REQUIRED,
    },
  });

  const lessonDate = new Date('2026-06-10T00:00:00+08:00');
  const existingLog = await prisma.teachingLog.findFirst({
    where: {
      teacherId: teacher3.id,
      courseId: course1.id,
      classGroupId: computerClass.id,
      lessonDate,
    },
  });
  if (existingLog) {
    await prisma.teachingLog.update({
      where: { id: existingLog.id },
      data: {
        content: '数组与函数综合练习',
        attendanceSummary: '应到3人，实到3人',
        status: TeachingLogStatus.SUBMITTED,
      },
    });
  } else {
    await prisma.teachingLog.create({
      data: {
        teacherId: teacher3.id,
        courseId: course1.id,
        classGroupId: computerClass.id,
        lessonDate,
        content: '数组与函数综合练习',
        attendanceSummary: '应到3人，实到3人',
        status: TeachingLogStatus.SUBMITTED,
      },
    });
  }

  const academicUser = users[1]!;
  const approvalInputs = [
    {
      businessType: 'CLASSROOM_REQUEST',
      businessId: classroomRequest.id,
      action: ApprovalAction.APPROVE,
      comment: '教室时间无冲突，同意申请',
    },
    {
      businessType: 'SCHEDULE_CHANGE',
      businessId: scheduleChange.id,
      action: ApprovalAction.SUBMIT,
      comment: '等待系部审核',
    },
    {
      businessType: 'EXAM',
      businessId: exam.id,
      action: ApprovalAction.APPROVE,
      comment: '考试安排审核通过',
    },
  ] as const;

  for (const input of approvalInputs) {
    const existing = await prisma.approvalRecord.findFirst({
      where: {
        businessType: input.businessType,
        businessId: input.businessId,
        operatorId: academicUser.id,
        action: input.action,
      },
    });
    if (existing) {
      await prisma.approvalRecord.update({
        where: { id: existing.id },
        data: { comment: input.comment },
      });
    } else {
      await prisma.approvalRecord.create({
        data: { ...input, operatorId: academicUser.id },
      });
    }
  }

  const operationInputs = [
    {
      userId: users[0]!.id,
      module: 'SYSTEM',
      action: 'SEED_DATA',
      targetId: null,
    },
    {
      userId: users[4]!.id,
      module: 'CLASSROOM_REQUEST',
      action: 'CREATE',
      targetId: classroomRequest.id,
    },
    {
      userId: academicUser.id,
      module: 'EXAM',
      action: 'APPROVE',
      targetId: exam.id,
    },
  ] as const;

  for (const input of operationInputs) {
    const existing = await prisma.operationLog.findFirst({
      where: { ...input },
    });
    if (!existing) {
      await prisma.operationLog.create({ data: input });
    }
  }

  // 批量场景数据：用于分页、筛选、统计、审批流和边界测试。
  const allTeachers = [teacher1, teacher2, teacher3, teacher4, teacher5];
  for (let index = 6; index <= 12; index += 1) {
    const employeeNo = `T${String(index).padStart(4, '0')}`;
    const department =
      index % 2 === 0 ? computerDepartment : softwareDepartment;
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

  const extraClassSpecs = [
    {
      name: '计算机2302班',
      grade: 2023,
      majorId: computerMajor.id,
      departmentId: computerDepartment.id,
      counselorId: teacher3.id,
    },
    {
      name: '软件工程2302班',
      grade: 2023,
      majorId: softwareMajor.id,
      departmentId: softwareDepartment.id,
      counselorId: teacher4.id,
    },
    {
      name: '计算机2401班',
      grade: 2024,
      majorId: computerMajor.id,
      departmentId: computerDepartment.id,
      counselorId: allTeachers[5]!.id,
    },
    {
      name: '软件工程2401班',
      grade: 2024,
      majorId: softwareMajor.id,
      departmentId: softwareDepartment.id,
      counselorId: allTeachers[6]!.id,
    },
  ];
  const extraClassGroups = [];
  for (const spec of extraClassSpecs) {
    const existing = await prisma.classGroup.findFirst({
      where: { name: spec.name },
    });
    extraClassGroups.push(
      existing
        ? await prisma.classGroup.update({
            where: { id: existing.id },
            data: { ...spec, studentCount: 0 },
          })
        : await prisma.classGroup.create({
            data: { ...spec, studentCount: 0 },
          }),
    );
  }
  const allClassGroups = [computerClass, softwareClass, ...extraClassGroups];

  const bulkStudentClassSpecs = [
    {
      classGroup: extraClassGroups[0]!,
      grade: 2023,
      majorCode: '01',
      classCode: '02',
    },
    {
      classGroup: extraClassGroups[1]!,
      grade: 2023,
      majorCode: '02',
      classCode: '02',
    },
    {
      classGroup: extraClassGroups[2]!,
      grade: 2024,
      majorCode: '01',
      classCode: '01',
    },
    {
      classGroup: extraClassGroups[3]!,
      grade: 2024,
      majorCode: '02',
      classCode: '01',
    },
  ];
  const bulkStudents = [];
  for (let index = 1; index <= 120; index += 1) {
    const classSpec =
      bulkStudentClassSpecs[(index - 1) % bulkStudentClassSpecs.length]!;
    const withinClassNo =
      Math.floor((index - 1) / bulkStudentClassSpecs.length) + 1;
    const studentNo = buildStudentNo(
      classSpec.grade,
      classSpec.majorCode,
      classSpec.classCode,
      withinClassNo,
    );
    const status =
      index % 40 === 0
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
        grade: classSpec.grade,
        status,
        phone: `1391000${String(index).padStart(4, '0')}`,
      }),
    );
  }
  for (const classGroup of allClassGroups) {
    const studentCount = await prisma.student.count({
      where: { classGroupId: classGroup.id },
    });
    await prisma.classGroup.update({
      where: { id: classGroup.id },
      data: { studentCount },
    });
  }

  const bulkCourses = [];
  for (let index = 1; index <= 15; index += 1) {
    const code = `TEST${String(index).padStart(3, '0')}`;
    const department =
      index % 2 === 0 ? computerDepartment : softwareDepartment;
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
          status:
            index % 6 === 0
              ? ClassroomStatus.MAINTENANCE
              : ClassroomStatus.AVAILABLE,
        },
        create: {
          roomNo,
          campus: index % 2 === 0 ? '主校区' : '新校区',
          building: '测试教学楼',
          type: index % 3 === 0 ? '计算机实验室' : '多媒体教室',
          capacity: 30 + index * 5,
          area: 60 + index * 4,
          status:
            index % 6 === 0
              ? ClassroomStatus.MAINTENANCE
              : ClassroomStatus.AVAILABLE,
        },
      }),
    );
  }

  const bulkTextbooks = [];
  for (let index = 1; index <= 10; index += 1) {
    const isbn = `9787000${String(index).padStart(6, '0')}`;
    bulkTextbooks.push(
      await prisma.textbook.upsert({
        where: { isbn },
        update: {
          name: `测试教材${String(index).padStart(2, '0')}`,
          author: `测试作者${index}`,
          publisher: '测试教育出版社',
          price: 35 + index * 2.5,
        },
        create: {
          isbn,
          name: `测试教材${String(index).padStart(2, '0')}`,
          author: `测试作者${index}`,
          publisher: '测试教育出版社',
          price: 35 + index * 2.5,
        },
      }),
    );
  }

  const bulkExams = [];
  for (let index = 1; index <= 18; index += 1) {
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const classroom = bulkClassrooms[(index - 1) % bulkClassrooms.length]!;
    const invigilator = allTeachers[index % allTeachers.length]!;
    const startTime = new Date(Date.UTC(2026, 5, 1 + index, 1, 0, 0));
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const existing = await prisma.exam.findFirst({
      where: {
        semesterId,
        courseId: course.id,
        classGroupId: classGroup.id,
        startTime,
      },
    });
    bulkExams.push(
      existing
        ? await prisma.exam.update({
            where: { id: existing.id },
            data: {
              classroomId: classroom.id,
              endTime,
              invigilatorId: invigilator.id,
            },
          })
        : await prisma.exam.create({
            data: {
              semesterId,
              courseId: course.id,
              classGroupId: classGroup.id,
              classroomId: classroom.id,
              startTime,
              endTime,
              invigilatorId: invigilator.id,
            },
          }),
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
      status:
        index % 4 === 0
          ? TextbookOrderStatus.RECEIVED
          : index % 3 === 0
            ? TextbookOrderStatus.APPROVED
            : TextbookOrderStatus.PENDING,
    };
    if (existing) {
      await prisma.textbookOrder.update({ where: { id: existing.id }, data });
    } else {
      await prisma.textbookOrder.create({
        data: {
          semesterId,
          courseId: course.id,
          textbookId: textbook.id,
          ...data,
        },
      });
    }
  }

  const bulkRequests = [];
  for (let index = 1; index <= 20; index += 1) {
    const applicant = users[4 + (index % 2)]!;
    const classroom = bulkClassrooms[(index - 1) % bulkClassrooms.length]!;
    const startTime = new Date(Date.UTC(2026, 3, 1 + index, 6, 0, 0));
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const existing = await prisma.classroomRequest.findFirst({
      where: {
        applicantId: applicant.id,
        classroomId: classroom.id,
        startTime,
      },
    });
    bulkRequests.push(
      existing
        ? await prisma.classroomRequest.update({
            where: { id: existing.id },
            data: {
              endTime,
              purpose: `批量教室申请${index}`,
              status:
                index % 4 === 0
                  ? WorkflowStatus.REJECTED
                  : WorkflowStatus.APPROVED,
            },
          })
        : await prisma.classroomRequest.create({
            data: {
              applicantId: applicant.id,
              classroomId: classroom.id,
              startTime,
              endTime,
              purpose: `批量教室申请${index}`,
              status:
                index % 4 === 0
                  ? WorkflowStatus.REJECTED
                  : WorkflowStatus.APPROVED,
            },
          }),
    );
  }

  const bulkChanges = [];
  for (let index = 1; index <= 15; index += 1) {
    const teacher = allTeachers[(index - 1) % allTeachers.length]!;
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const reason = `批量调课测试原因${index}`;
    const existing = await prisma.scheduleChange.findFirst({
      where: {
        teacherId: teacher.id,
        courseId: course.id,
        classGroupId: classGroup.id,
        reason,
      },
    });
    bulkChanges.push(
      existing
        ? await prisma.scheduleChange.update({
            where: { id: existing.id },
            data: {
              hours: 1 + (index % 4),
              status:
                index % 5 === 0
                  ? WorkflowStatus.REJECTED
                  : WorkflowStatus.PENDING,
            },
          })
        : await prisma.scheduleChange.create({
            data: {
              teacherId: teacher.id,
              courseId: course.id,
              classGroupId: classGroup.id,
              hours: 1 + (index % 4),
              reason,
              status:
                index % 5 === 0
                  ? WorkflowStatus.REJECTED
                  : WorkflowStatus.PENDING,
            },
          }),
    );
  }

  for (let index = 0; index < 40; index += 1) {
    const student = bulkStudents[index]!;
    const hasFailedRequiredCourse = index % 7 === 0;
    const totalCredits = hasFailedRequiredCourse
      ? 110 + (index % 10)
      : 120 + (index % 18);
    const result = hasFailedRequiredCourse
      ? GraduationResult.REVIEW_REQUIRED
      : totalCredits >= 120
        ? GraduationResult.PASSED
        : GraduationResult.FAILED;
    await prisma.graduationReview.upsert({
      where: { studentId_semesterId: { studentId: student.id, semesterId } },
      update: { totalCredits, hasFailedRequiredCourse, result },
      create: {
        studentId: student.id,
        semesterId,
        totalCredits,
        hasFailedRequiredCourse,
        result,
      },
    });
  }

  for (let index = 1; index <= 30; index += 1) {
    const teacher = allTeachers[(index - 1) % allTeachers.length]!;
    const course = bulkCourses[(index - 1) % bulkCourses.length]!;
    const classGroup = allClassGroups[(index - 1) % allClassGroups.length]!;
    const bulkLessonDate = new Date(Date.UTC(2026, 2, 1 + index, 0, 0, 0));
    const existing = await prisma.teachingLog.findFirst({
      where: {
        teacherId: teacher.id,
        courseId: course.id,
        classGroupId: classGroup.id,
        lessonDate: bulkLessonDate,
      },
    });
    const data = {
      content: `第${index}次批量教学日志：课堂教学与练习`,
      attendanceSummary: `应到${30 + (index % 20)}人，缺勤${index % 4}人`,
      status:
        index % 4 === 0
          ? TeachingLogStatus.APPROVED
          : TeachingLogStatus.SUBMITTED,
    };
    if (existing) {
      await prisma.teachingLog.update({ where: { id: existing.id }, data });
    } else {
      await prisma.teachingLog.create({
        data: {
          teacherId: teacher.id,
          courseId: course.id,
          classGroupId: classGroup.id,
          lessonDate: bulkLessonDate,
          ...data,
        },
      });
    }
  }

  for (const request of bulkRequests) {
    const action =
      request.status === WorkflowStatus.REJECTED
        ? ApprovalAction.REJECT
        : ApprovalAction.APPROVE;
    const existing = await prisma.approvalRecord.findFirst({
      where: {
        businessType: 'CLASSROOM_REQUEST',
        businessId: request.id,
        operatorId: academicUser.id,
        action,
      },
    });
    if (!existing) {
      await prisma.approvalRecord.create({
        data: {
          businessType: 'CLASSROOM_REQUEST',
          businessId: request.id,
          operatorId: academicUser.id,
          action,
          comment: '批量审批测试记录',
        },
      });
    }
  }

  for (let index = 0; index < 25; index += 1) {
    const examRecord = bulkExams[index % bulkExams.length]!;
    const existing = await prisma.operationLog.findFirst({
      where: {
        userId: academicUser.id,
        module: 'EXAM',
        action: `BULK_TEST_${index + 1}`,
        targetId: examRecord.id,
      },
    });
    if (!existing) {
      await prisma.operationLog.create({
        data: {
          userId: academicUser.id,
          module: 'EXAM',
          action: `BULK_TEST_${index + 1}`,
          targetId: examRecord.id,
        },
      });
    }
  }

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

  const studentNoRows = await prisma.student.findMany({
    select: { studentNo: true, grade: true },
    orderBy: { studentNo: 'asc' },
  });
  const invalidStudentNos = studentNoRows.filter(
    ({ studentNo, grade }) =>
      !/^\d{12}$/.test(studentNo) ||
      studentNo.slice(0, 4) !== String(grade) ||
      studentNo.slice(4, 6) !== seedCollegeCode,
  );

  if (invalidStudentNos.length > 0) {
    throw new Error(
      `Found ${invalidStudentNos.length} invalid student numbers: ${invalidStudentNos
        .slice(0, 5)
        .map((item) => item.studentNo)
        .join(', ')}`,
    );
  }

  console.log(
    `Student number check passed: ${studentNoRows.length} records match 4-2-2-2-2.`,
  );

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
  if (totalRecords < 200) {
    throw new Error(`Seed数据总量不足200条，当前只有${totalRecords}条`);
  }

  console.log('Seed执行完成。');
  console.log(
    '测试账号：admin、academic_admin、department_admin、research_director、teacher、student、textbook_admin、leader',
  );
  console.log(`默认测试密码：${defaultPassword}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed执行失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
