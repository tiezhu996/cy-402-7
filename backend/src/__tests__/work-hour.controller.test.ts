import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import * as workHourService from "../services/work-hour.service";
import {
  list,
  detail,
  create,
  remove,
  summary as controllerSummary
} from "../controllers/work-hour.controller";
import { HttpError } from "../utils/http-error";
import type { WorkHourSummary, WorkHourWithRelations } from "../services/work-hour.service";

jest.mock("../services/work-hour.service");

const mockWorkHour: WorkHourWithRelations = {
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

function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("work-hour.controller", () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("应返回工时列表并正确解析查询参数", async (): Promise<void> => {
      const req = {
        query: { caseId: "case-1", startDate: "2026-06-01" }
      } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.listWorkHours as jest.Mock).mockResolvedValue([mockWorkHour]);

      await list(req, res);

      expect(workHourService.listWorkHours).toHaveBeenCalledWith({
        caseId: "case-1",
        startDate: "2026-06-01",
        lawyerId: undefined,
        endDate: undefined
      });
      expect(res.json).toHaveBeenCalledWith({ data: [mockWorkHour] });
    });

    it("无查询参数时 filters 字段应为 undefined", async (): Promise<void> => {
      const req = { query: {} } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.listWorkHours as jest.Mock).mockResolvedValue([]);

      await list(req, res);

      expect(workHourService.listWorkHours).toHaveBeenCalledWith({
        caseId: undefined,
        lawyerId: undefined,
        startDate: undefined,
        endDate: undefined
      });
    });
  });

  describe("detail", () => {
    it("应返回单条工时记录", async (): Promise<void> => {
      const req = { params: { id: "wh-1" } } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.getWorkHour as jest.Mock).mockResolvedValue(mockWorkHour);

      await detail(req, res);

      expect(workHourService.getWorkHour).toHaveBeenCalledWith("wh-1");
      expect(res.json).toHaveBeenCalledWith({ data: mockWorkHour });
    });

    it("记录不存在时应抛 404 HttpError", async (): Promise<void> => {
      const req = { params: { id: "nonexistent" } } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.getWorkHour as jest.Mock).mockResolvedValue(null);

      await expect(detail(req, res)).rejects.toThrow(HttpError);
      await expect(detail(req, res)).rejects.toMatchObject({
        statusCode: 404,
        message: "工时记录不存在"
      });
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const validBody = {
      workDate: "2026-06-10",
      hours: 2.5,
      description: "起草答辩状",
      caseId: "550e8400-e29b-41d4-a716-446655440000",
      lawyerId: "550e8400-e29b-41d4-a716-446655440001"
    };

    it("应成功创建并返回 201 状态码", async (): Promise<void> => {
      const req = { body: validBody } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.createWorkHour as jest.Mock).mockResolvedValue(mockWorkHour);

      await create(req, res);

      expect(workHourService.createWorkHour).toHaveBeenCalledWith(validBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: mockWorkHour });
    });

    it("工时为 0 时 Zod 校验应失败", async (): Promise<void> => {
      const req = {
        body: { ...validBody, hours: 0 }
      } as unknown as Request;
      const res = mockResponse() as Response;

      await expect(create(req, res)).rejects.toThrow();
      expect(workHourService.createWorkHour).not.toHaveBeenCalled();
    });

    it("工时超过 24 小时时 Zod 校验应失败", async (): Promise<void> => {
      const req = {
        body: { ...validBody, hours: 25 }
      } as unknown as Request;
      const res = mockResponse() as Response;

      await expect(create(req, res)).rejects.toThrow();
      expect(workHourService.createWorkHour).not.toHaveBeenCalled();
    });

    it("事项描述不足 2 字符时 Zod 校验应失败", async (): Promise<void> => {
      const req = {
        body: { ...validBody, description: "1" }
      } as unknown as Request;
      const res = mockResponse() as Response;

      await expect(create(req, res)).rejects.toThrow();
      expect(workHourService.createWorkHour).not.toHaveBeenCalled();
    });

    it("caseId 不是有效 UUID 时 Zod 校验应失败", async (): Promise<void> => {
      const req = {
        body: { ...validBody, caseId: "invalid-uuid" }
      } as unknown as Request;
      const res = mockResponse() as Response;

      await expect(create(req, res)).rejects.toThrow();
      expect(workHourService.createWorkHour).not.toHaveBeenCalled();
    });

    it("已结案案件时应抛 service 层错误", async (): Promise<void> => {
      const req = { body: validBody } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.createWorkHour as jest.Mock).mockRejectedValue(
        new HttpError(400, "已结案或归档的案件不能再补录工时")
      );

      await expect(create(req, res)).rejects.toThrow(HttpError);
      await expect(create(req, res)).rejects.toMatchObject({ statusCode: 400 });
      expect(res.status).not.toHaveBeenCalledWith(201);
    });
  });

  describe("remove", () => {
    it("应成功删除并返回 success: true", async (): Promise<void> => {
      const req = { params: { id: "wh-1" } } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.deleteWorkHour as jest.Mock).mockResolvedValue(undefined);

      await remove(req, res);

      expect(workHourService.deleteWorkHour).toHaveBeenCalledWith("wh-1");
      expect(res.json).toHaveBeenCalledWith({ data: { success: true } });
    });

    it("记录不存在时应抛 service 层错误", async (): Promise<void> => {
      const req = { params: { id: "nonexistent" } } as unknown as Request;
      const res = mockResponse() as Response;

      (workHourService.deleteWorkHour as jest.Mock).mockRejectedValue(
        new HttpError(404, "工时记录不存在")
      );

      await expect(remove(req, res)).rejects.toThrow(HttpError);
      await expect(remove(req, res)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("summary", () => {
    it("应返回案件工时汇总", async (): Promise<void> => {
      const req = { params: { caseId: "case-1" } } as unknown as Request;
      const res = mockResponse() as Response;
      const summary: WorkHourSummary = { totalHours: 10.5, recordCount: 3 };

      (workHourService.getCaseWorkHourSummary as jest.Mock).mockResolvedValue(summary);

      await controllerSummary(req, res);

      expect(workHourService.getCaseWorkHourSummary).toHaveBeenCalledWith("case-1");
      expect(res.json).toHaveBeenCalledWith({ data: summary });
    });
  });
});
