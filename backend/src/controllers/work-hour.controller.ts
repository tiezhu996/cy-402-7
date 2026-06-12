import type { Request, Response } from "express";
import { z } from "zod";
import type { WorkHourFilters, WorkHourSummary, WorkHourWithRelations } from "../services/work-hour.service";
import * as workHourService from "../services/work-hour.service";
import { HttpError } from "../utils/http-error";

const createWorkHourSchema = z.object({
  workDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  hours: z.union([z.string(), z.number()]).transform(Number).refine((v) => v > 0 && v <= 24, {
    message: "工时必须大于0且不超过24小时"
  }),
  description: z.string().min(2, { message: "事项描述至少2个字符" }),
  caseId: z.string().uuid(),
  lawyerId: z.string().uuid()
});

export async function list(req: Request, res: Response): Promise<void> {
  const filters: WorkHourFilters = {
    caseId: typeof req.query.caseId === "string" ? req.query.caseId : undefined,
    lawyerId: typeof req.query.lawyerId === "string" ? req.query.lawyerId : undefined,
    startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined
  };
  const data: WorkHourWithRelations[] = await workHourService.listWorkHours(filters);
  res.json({ data });
}

export async function detail(req: Request, res: Response): Promise<void> {
  const data: WorkHourWithRelations | null = await workHourService.getWorkHour(req.params.id);
  if (!data) {
    throw new HttpError(404, "工时记录不存在");
  }
  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createWorkHourSchema.parse(req.body);
  const data: WorkHourWithRelations = await workHourService.createWorkHour(input);
  res.status(201).json({ data });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await workHourService.deleteWorkHour(req.params.id);
  res.json({ data: { success: true } });
}

export async function summary(req: Request, res: Response): Promise<void> {
  const caseId: string = req.params.caseId;
  const data: WorkHourSummary = await workHourService.getCaseWorkHourSummary(caseId);
  res.json({ data });
}
