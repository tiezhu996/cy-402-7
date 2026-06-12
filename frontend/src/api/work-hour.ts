import { request } from "./request";
import type { ApiResponse, WorkHour, WorkHourSummary } from "../types";

export type WorkHourQuery = {
  caseId?: string;
  lawyerId?: string;
  startDate?: string;
  endDate?: string;
};

export type CreateWorkHourPayload = {
  workDate: string;
  hours: number | string;
  description: string;
  caseId: string;
  lawyerId: string;
};

export async function listWorkHours(params?: WorkHourQuery): Promise<WorkHour[]> {
  const { data } = await request.get<ApiResponse<WorkHour[]>>("/work-hours", { params });
  return data.data;
}

export async function getWorkHour(id: string): Promise<WorkHour> {
  const { data } = await request.get<ApiResponse<WorkHour>>(`/work-hours/${id}`);
  return data.data;
}

export async function createWorkHour(payload: CreateWorkHourPayload): Promise<WorkHour> {
  const { data } = await request.post<ApiResponse<WorkHour>>("/work-hours", payload);
  return data.data;
}

export async function deleteWorkHour(id: string): Promise<{ success: boolean }> {
  const { data } = await request.delete<ApiResponse<{ success: boolean }>>(`/work-hours/${id}`);
  return data.data;
}

export async function getCaseWorkHourSummary(caseId: string): Promise<WorkHourSummary> {
  const { data } = await request.get<ApiResponse<WorkHourSummary>>(`/work-hours/case/${caseId}/summary`);
  return data.data;
}
