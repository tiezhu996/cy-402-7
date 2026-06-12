import { CaseStatus, Prisma, type WorkHour } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../utils/prisma";
import {
  listWorkHours,
  getWorkHour,
  createWorkHour,
  deleteWorkHour,
  getCaseWorkHourSummary,
  type WorkHourWithRelations
} from "../services/work-hour.service";
import { HttpError } from "../utils/http-error";
import type { WorkHourFilters } from "../services/work-hour.service";
import type { DeepMockProxy } from "jest-mock-extended";

const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

const mockWorkHourRecord: WorkHourWithRelations = {
  id: "wh-1",
  workDate: new Date("2026-06-01"),
  hours: new Prisma.Decimal(3.5),
  description: "审阅案卷材料",
  caseId: "case-1",
  lawyerId: "user-1",
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  lawyer: { id: "user-1", name: "周明律", email: "lawyer@cylawcase.local" },
  case: { id: "case-1", caseNo: "CY-2026-M-001", title: "测试案件", status: "hearing" }
};

describe("work-hour.service", () => {
  describe("listWorkHours", () => {
    it("应返回工时记录列表", async (): Promise<void> => {
      const filters: WorkHourFilters = { caseId: "case-1" };
      mockPrisma.workHour.findMany.mockResolvedValue([mockWorkHourRecord]);

      const result: WorkHourWithRelations[] = await listWorkHours(filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("wh-1");
      expect(mockPrisma.workHour.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: "case-1" } })
      );
    });

    it("应按日期范围过滤", async (): Promise<void> => {
      const filters: WorkHourFilters = { startDate: "2026-06-01", endDate: "2026-06-30" };
      mockPrisma.workHour.findMany.mockResolvedValue([]);

      await listWorkHours(filters);

      expect(mockPrisma.workHour.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workDate: {
              gte: new Date("2026-06-01"),
              lte: new Date("2026-06-30T23:59:59")
            }
          }
        })
      );
    });
  });

  describe("getWorkHour", () => {
    it("应返回单条工时记录", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue(mockWorkHourRecord);

      const result: WorkHourWithRelations | null = await getWorkHour("wh-1");

      expect(result?.id).toBe("wh-1");
      expect(mockPrisma.workHour.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "wh-1" } })
      );
    });

    it("记录不存在时返回 null", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue(null);

      const result: WorkHourWithRelations | null = await getWorkHour("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createWorkHour", () => {
    const validInput = {
      workDate: "2026-06-10",
      hours: 2.5,
      description: "起草答辩状",
      caseId: "case-1",
      lawyerId: "user-1"
    };

    it("应成功创建工时记录（审理中案件）", async (): Promise<void> => {
      mockPrisma.case.findUnique.mockResolvedValue({ status: CaseStatus.hearing } as unknown as any);
      mockPrisma.workHour.create.mockResolvedValue(mockWorkHourRecord);

      const result: WorkHourWithRelations = await createWorkHour(validInput);

      expect(result.id).toBe("wh-1");
      expect(mockPrisma.case.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "case-1" } })
      );
      expect(mockPrisma.workHour.create).toHaveBeenCalled();
    });

    it("已结案案件应拒绝创建工时记录", async (): Promise<void> => {
      mockPrisma.case.findUnique.mockResolvedValue({ status: CaseStatus.closed } as unknown as any);

      await expect(createWorkHour(validInput)).rejects.toThrow(HttpError);
      await expect(createWorkHour(validInput)).rejects.toMatchObject({
        statusCode: 400,
        message: "已结案或归档的案件不能再补录工时"
      });
      expect(mockPrisma.workHour.create).not.toHaveBeenCalled();
    });

    it("已归档案件应拒绝创建工时记录", async (): Promise<void> => {
      mockPrisma.case.findUnique.mockResolvedValue({ status: CaseStatus.archived } as unknown as any);

      await expect(createWorkHour(validInput)).rejects.toThrow(HttpError);
      await expect(createWorkHour(validInput)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockPrisma.workHour.create).not.toHaveBeenCalled();
    });

    it("案件不存在应抛 404", async (): Promise<void> => {
      mockPrisma.case.findUnique.mockResolvedValue(null);

      await expect(createWorkHour(validInput)).rejects.toThrow(HttpError);
      await expect(createWorkHour(validInput)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockPrisma.workHour.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteWorkHour", () => {
    it("应成功删除工时记录（审理中案件）", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue({
        ...mockWorkHourRecord,
        case: { status: CaseStatus.hearing }
      } as unknown as any);
      mockPrisma.workHour.delete.mockResolvedValue({
        id: "wh-1",
        workDate: new Date(),
        hours: new Prisma.Decimal(3.5),
        description: "",
        caseId: "case-1",
        lawyerId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date()
      } as WorkHour);

      await deleteWorkHour("wh-1");

      expect(mockPrisma.workHour.delete).toHaveBeenCalledWith({ where: { id: "wh-1" } });
    });

    it("已结案案件应拒绝删除工时记录", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue({
        ...mockWorkHourRecord,
        case: { status: CaseStatus.closed }
      } as unknown as any);

      await expect(deleteWorkHour("wh-1")).rejects.toThrow(HttpError);
      await expect(deleteWorkHour("wh-1")).rejects.toMatchObject({ statusCode: 400 });
      expect(mockPrisma.workHour.delete).not.toHaveBeenCalled();
    });

    it("已归档案件应拒绝删除工时记录", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue({
        ...mockWorkHourRecord,
        case: { status: CaseStatus.archived }
      } as unknown as any);

      await expect(deleteWorkHour("wh-1")).rejects.toThrow(HttpError);
      expect(mockPrisma.workHour.delete).not.toHaveBeenCalled();
    });

    it("记录不存在应抛 404", async (): Promise<void> => {
      mockPrisma.workHour.findUnique.mockResolvedValue(null);

      await expect(deleteWorkHour("wh-1")).rejects.toThrow(HttpError);
      await expect(deleteWorkHour("wh-1")).rejects.toMatchObject({ statusCode: 404 });
      expect(mockPrisma.workHour.delete).not.toHaveBeenCalled();
    });
  });

  describe("getCaseWorkHourSummary", () => {
    it("应正确计算累计工时和记录数", async (): Promise<void> => {
      mockPrisma.workHour.findMany.mockResolvedValue([
        { hours: new Prisma.Decimal(2.5) },
        { hours: new Prisma.Decimal(3.0) },
        { hours: new Prisma.Decimal(1.5) }
      ] as unknown as any);

      const result = await getCaseWorkHourSummary("case-1");

      expect(result.totalHours).toBe(7.0);
      expect(result.recordCount).toBe(3);
    });

    it("无记录时累计工时应为 0", async (): Promise<void> => {
      mockPrisma.workHour.findMany.mockResolvedValue([]);

      const result = await getCaseWorkHourSummary("case-empty");

      expect(result.totalHours).toBe(0);
      expect(result.recordCount).toBe(0);
    });
  });
});
