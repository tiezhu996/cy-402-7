import { CaseStatus, type Prisma, type WorkHour } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

export type WorkHourFilters = {
  caseId?: string;
  lawyerId?: string;
  startDate?: string;
  endDate?: string;
};

export type WorkHourSummary = {
  totalHours: number;
  recordCount: number;
};

const workHourInclude = {
  lawyer: { select: { id: true, name: true, email: true } },
  case: { select: { id: true, caseNo: true, title: true, status: true } }
} as const;

export type WorkHourWithRelations = Prisma.WorkHourGetPayload<{
  include: typeof workHourInclude;
}>;

export async function listWorkHours(filters: WorkHourFilters): Promise<WorkHourWithRelations[]> {
  return prisma.workHour.findMany({
    where: {
      caseId: filters.caseId,
      lawyerId: filters.lawyerId,
      workDate:
        filters.startDate || filters.endDate
          ? {
              gte: filters.startDate ? new Date(filters.startDate) : undefined,
              lte: filters.endDate ? new Date(filters.endDate + "T23:59:59") : undefined
            }
          : undefined
    },
    include: workHourInclude,
    orderBy: { workDate: "desc" }
  });
}

export async function getWorkHour(id: string): Promise<WorkHourWithRelations | null> {
  return prisma.workHour.findUnique({
    where: { id },
    include: workHourInclude
  });
}

export async function createWorkHour(input: {
  workDate: string;
  hours: number | string;
  description: string;
  caseId: string;
  lawyerId: string;
}): Promise<WorkHourWithRelations> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: input.caseId },
    select: { status: true }
  });
  if (!caseRecord) {
    throw new HttpError(404, "案件不存在");
  }
  if (caseRecord.status === CaseStatus.closed || caseRecord.status === CaseStatus.archived) {
    throw new HttpError(400, "已结案或归档的案件不能再补录工时");
  }

  return prisma.workHour.create({
    data: {
      workDate: new Date(input.workDate),
      hours: input.hours,
      description: input.description,
      caseId: input.caseId,
      lawyerId: input.lawyerId
    },
    include: workHourInclude
  });
}

export async function deleteWorkHour(id: string): Promise<WorkHour> {
  const record = await prisma.workHour.findUnique({
    where: { id },
    include: { case: { select: { status: true } } }
  });
  if (!record) {
    throw new HttpError(404, "工时记录不存在");
  }
  if (record.case.status === CaseStatus.closed || record.case.status === CaseStatus.archived) {
    throw new HttpError(400, "已结案或归档案件的工时记录不能删除");
  }
  return prisma.workHour.delete({ where: { id } });
}

export async function getCaseWorkHourSummary(caseId: string): Promise<WorkHourSummary> {
  const records = await prisma.workHour.findMany({
    where: { caseId },
    select: { hours: true }
  });
  const totalHours = records.reduce((acc, r) => acc + Number(r.hours), 0);
  return { totalHours, recordCount: records.length };
}
