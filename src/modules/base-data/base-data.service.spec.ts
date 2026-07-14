import { NotFoundException } from '@nestjs/common';
import { BaseDataService } from './base-data.service';

describe('BaseDataService', () => {
  const findUnique = jest.fn<Promise<unknown>, [unknown]>();
  const service = new BaseDataService({
    course: { findUnique },
  } as never);

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns a course with its database-backed arrangements', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      code: 'CS101',
      name: '数据库原理',
      credits: '3.5',
      courseType: '必修',
      department: { id: 2, code: 'CS', name: '计算机系' },
      director: {
        id: 3,
        employeeNo: 'T003',
        name: '张老师',
        title: '副教授',
      },
      exams: [
        {
          id: 10,
          semesterId: 20261,
          classGroup: { id: 4, name: '计科一班', grade: 2024 },
          classroom: {
            id: 5,
            campus: '主校区',
            building: '一教',
            roomNo: '101',
          },
          startTime: new Date('2026-07-20T01:00:00.000Z'),
          endTime: new Date('2026-07-20T03:00:00.000Z'),
          invigilator: { id: 6, employeeNo: 'T006', name: '李老师' },
        },
      ],
      scheduleChanges: [
        {
          id: 11,
          teacher: { id: 3, employeeNo: 'T003', name: '张老师' },
          classGroup: { id: 4, name: '计科一班', grade: 2024 },
          hours: '2.0',
          reason: '教学进度调整',
          status: 'APPROVED',
        },
      ],
      textbookOrders: [
        {
          id: 12,
          semesterId: 20261,
          quantity: 40,
          status: 'ORDERED',
          textbook: {
            id: 7,
            isbn: '9780000000001',
            name: '数据库系统概论',
            author: '作者',
            publisher: '出版社',
            price: '59.80',
          },
        },
      ],
      teachingLogs: [
        {
          id: 13,
          teacher: { id: 3, employeeNo: 'T003', name: '张老师' },
          classGroup: { id: 4, name: '计科一班', grade: 2024 },
          lessonDate: new Date('2026-07-01T00:00:00.000Z'),
          content: '关系模型',
          attendanceSummary: '全勤',
          status: 'APPROVED',
        },
      ],
    });

    const result = await service.findCourseDetail(1, { semesterId: 20261 });

    expect(findUnique).toHaveBeenCalledTimes(1);
    const callArgument: unknown = findUnique.mock.calls[0]?.[0];
    const detailQuery = callArgument as {
      where: { id: number };
      include: {
        exams: { where: { semesterId?: number } };
        textbookOrders: { where: { semesterId?: number } };
      };
    };
    expect(detailQuery.where).toEqual({ id: 1 });
    expect(detailQuery.include.exams.where).toEqual({ semesterId: 20261 });
    expect(detailQuery.include.textbookOrders.where).toEqual({
      semesterId: 20261,
    });
    expect(result.credits).toBe(3.5);
    expect(result.arrangements.exams[0]?.startTime).toBe(
      '2026-07-20T01:00:00.000Z',
    );
    expect(result.arrangements.scheduleChanges[0]?.hours).toBe(2);
    expect(result.arrangements.textbookOrders[0]?.textbook.price).toBe(59.8);
    expect(result.arrangements.teachingLogs[0]?.lessonDate).toBe('2026-07-01');
  });

  it('throws when the course does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findCourseDetail(999, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
