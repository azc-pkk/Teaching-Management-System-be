import 'dotenv/config';
import { fakerZH_CN as faker } from '@faker-js/faker';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

type MariaDbPoolConfig = Exclude<
  ConstructorParameters<typeof PrismaMariaDb>[0],
  string
>;

function createMariaDbPoolConfig(urlString: string): MariaDbPoolConfig {
  const url = new URL(urlString);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
  };
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before running seed.');
}

const adapter = new PrismaMariaDb(createMariaDbPoolConfig(databaseUrl));
const prisma = new PrismaClient({ adapter });

const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
const timeOnly = (value: string) => new Date(`1970-01-01T${value}.000Z`);

async function cleanDatabase() {
  await prisma.attendanceRecord.deleteMany();
  await prisma.examStudent.deleteMany();
  await prisma.graduationAudit.deleteMany();
  await prisma.teachingLog.deleteMany();
  await prisma.textbookOrder.deleteMany();
  await prisma.textbook.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.courseAdjustment.deleteMany();
  await prisma.classroomApplication.deleteMany();
  await prisma.teachingSchedule.deleteMany();
  await prisma.student.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.course.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.teachingOffice.deleteMany();
  await prisma.major.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  faker.seed(20260711);

  console.log('开始初始化教学过程管理系统演示数据...');
  await cleanDatabase();

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: 'demo-password-hash',
      realName: '系统管理员',
      role: 'ADMIN',
      phone: '13800000000',
      email: 'admin@example.com',
    },
  });

  const academicUser = await prisma.user.create({
    data: {
      username: 'academic_admin',
      passwordHash: 'demo-password-hash',
      realName: '教务管理员',
      role: 'ACADEMIC',
      phone: '13800000001',
      email: 'academic@example.com',
    },
  });

  const office = await prisma.teachingOffice.create({
    data: {
      officeCode: 'CS001',
      officeName: '计算机教研室',
      directorName: '张主任',
      department: '计算机学院',
    },
  });

  const majorNames = ['软件工程', '计算机科学与技术', '人工智能'];
  const majors = await Promise.all(
    majorNames.map((majorName, index) =>
      prisma.major.create({
        data: {
          majorCode: `M${String(index + 1).padStart(3, '0')}`,
          majorName,
          departmentName: '计算机学院',
          degreeType: '本科',
          durationYears: 4,
        },
      }),
    ),
  );

  const classes = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      prisma.studentClass.create({
        data: {
          classCode: `CS2023${index + 1}`,
          className: `软件工程2023-${index + 1}班`,
          gradeYear: 2023,
          campus: '主校区',
          counselorName: faker.person.fullName(),
          studentCount: 8,
          majorId: majors[index % majors.length].id,
        },
      }),
    ),
  );

  const teachers = [];
  for (let index = 0; index < 6; index += 1) {
    const user = await prisma.user.create({
      data: {
        username: `teacher${index + 1}`,
        passwordHash: 'demo-password-hash',
        realName: faker.person.fullName(),
        role: 'TEACHER',
        phone: faker.phone.number(),
        email: faker.internet.email(),
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        teacherNo: `T${String(index + 1).padStart(4, '0')}`,
        teacherName: user.realName,
        teacherType: '专职教师',
        title: index % 2 === 0 ? '讲师' : '副教授',
        phone: user.phone,
        email: user.email,
        officeId: office.id,
        userId: user.id,
      },
    });

    teachers.push(teacher);
  }

  const students = [];
  for (let index = 0; index < 24; index += 1) {
    const user = await prisma.user.create({
      data: {
        username: `student${index + 1}`,
        passwordHash: 'demo-password-hash',
        realName: faker.person.fullName(),
        role: 'STUDENT',
        phone: faker.phone.number(),
        email: faker.internet.email(),
      },
    });

    const student = await prisma.student.create({
      data: {
        studentNo: `S2023${String(index + 1).padStart(4, '0')}`,
        studentName: user.realName,
        gender: index % 2 === 0 ? '男' : '女',
        phone: user.phone,
        email: user.email,
        admissionYear: 2023,
        status: 'ENROLLED',
        classId: classes[index % classes.length].id,
        userId: user.id,
      },
    });

    students.push(student);
  }

  const classrooms = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      prisma.classroom.create({
        data: {
          roomCode: `A${String(101 + index)}`,
          roomName: `A${String(101 + index)}`,
          campus: '主校区',
          building: '教学楼A',
          roomType: index % 2 === 0 ? '多媒体教室' : '普通教室',
          capacity: index % 2 === 0 ? 80 : 50,
          area: index % 2 === 0 ? '96.50' : '72.00',
          managerName: faker.person.fullName(),
          status: 'AVAILABLE',
        },
      }),
    ),
  );

  const courseNames = [
    '数据库原理',
    '软件工程导论',
    'Web 前端开发',
    '数据结构',
    '操作系统',
    '人工智能基础',
  ];
  const courses = [];
  for (let index = 0; index < courseNames.length; index += 1) {
    const course = await prisma.course.create({
      data: {
        courseCode: `CS${String(index + 1).padStart(3, '0')}`,
        courseName: courseNames[index],
        credit: '3.0',
        totalHours: 48,
        courseType: index % 2 === 0 ? '专业课' : '公共课',
        assessmentMethod: '考试',
        participateMakeup: true,
        officeId: office.id,
        leaderTeacherId: teachers[index % teachers.length].id,
      },
    });

    courses.push(course);
  }

  const schedules = [];
  for (let index = 0; index < courses.length; index += 1) {
    const schedule = await prisma.teachingSchedule.create({
      data: {
        semester: '2026-2027-1',
        weekInfo: '1-16周',
        weekday: (index % 5) + 1,
        startSection: 1 + (index % 4) * 2,
        endSection: 2 + (index % 4) * 2,
        courseId: courses[index].id,
        teacherId: teachers[index % teachers.length].id,
        classId: classes[index % classes.length].id,
        classroomId: classrooms[index % classrooms.length].id,
      },
    });

    schedules.push(schedule);
  }

  await prisma.classroomApplication.create({
    data: {
      purpose: '软件工程课程答辩',
      useDate: dateOnly('2026-09-18'),
      startTime: timeOnly('09:00:00'),
      endTime: timeOnly('11:00:00'),
      status: 'PENDING',
      comment: '需要投影设备',
      applicantId: academicUser.id,
      classroomId: classrooms[0].id,
    },
  });

  await prisma.courseAdjustment.create({
    data: {
      originalDate: dateOnly('2026-09-21'),
      newDate: dateOnly('2026-09-24'),
      adjustedHours: 2,
      reason: '教师参加学院会议',
      status: 'PENDING',
      scheduleId: schedules[0].id,
      teacherId: teachers[0].id,
      newClassroomId: classrooms[1].id,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      examCode: 'EX202601001',
      examType: 'FINAL',
      examDate: dateOnly('2027-01-08'),
      startTime: timeOnly('09:00:00'),
      endTime: timeOnly('11:00:00'),
      expectedCount: 24,
      actualCount: 24,
      absentCount: 0,
      courseId: courses[0].id,
      classId: classes[0].id,
      classroomId: classrooms[0].id,
      invigilatorId: teachers[1].id,
    },
  });

  await Promise.all(
    students.slice(0, 8).map((student, index) =>
      prisma.examStudent.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          seatNumber: String(index + 1).padStart(2, '0'),
          admissionCode: `EX202601001-${String(index + 1).padStart(3, '0')}`,
          score: index % 5 === 0 ? undefined : String(75 + index),
          isAbsent: false,
        },
      }),
    ),
  );

  const textbook = await prisma.textbook.create({
    data: {
      isbn: '9787110000001',
      bookName: '数据库系统概论',
      author: '教学示例作者',
      publisher: '高等教育出版社',
      price: '59.80',
      stock: 120,
      description: '数据库课程演示教材',
    },
  });

  await prisma.textbookOrder.create({
    data: {
      semester: '2026-2027-1',
      quantity: 80,
      status: 'APPROVED',
      textbookId: textbook.id,
      courseId: courses[0].id,
    },
  });

  const teachingLog = await prisma.teachingLog.create({
    data: {
      teachingDate: dateOnly('2026-09-07'),
      teachingContent: '数据库课程第一讲：关系模型与 SQL 基础',
      attendanceNote: '整体出勤良好',
      submittedAt: new Date(),
      scheduleId: schedules[0].id,
      teacherId: teachers[0].id,
    },
  });

  await Promise.all(
    students.slice(0, 8).map((student, index) =>
      prisma.attendanceRecord.create({
        data: {
          teachingLogId: teachingLog.id,
          studentId: student.id,
          status: index === 0 ? 'LATE' : 'PRESENT',
          remark: index === 0 ? '迟到 5 分钟' : undefined,
        },
      }),
    ),
  );

  await Promise.all(
    students.slice(0, 4).map((student, index) =>
      prisma.graduationAudit.create({
        data: {
          studentId: student.id,
          requiredCredits: '160.0',
          earnedCredits: String(150 + index * 2),
          failedCourses: index,
          status: index < 2 ? 'PASSED' : 'PENDING',
          auditComment: index < 2 ? '满足毕业要求' : '待补充课程成绩',
          auditedAt: index < 2 ? new Date() : undefined,
        },
      }),
    ),
  );

  console.log(`初始化完成：admin 用户 ID ${adminUser.id}`);
}

main()
  .catch((error) => {
    console.error('初始化失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
