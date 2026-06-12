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

export async function listWorkHours(params?: WorkHourQuery) {
  const { data } = await request.get<ApiResponse<WorkHour[]>>("/work-hours", { params });
  return data.data;
}

export async function getWorkHour(id: string) {
  const { data } = await request.get<ApiResponse<WorkHour>>(`/work-hours/${id}`);
  return data.data;
}

export async function createWorkHour(payload: CreateWorkHourPayload) {
  const { data } = await request.post<ApiResponse<WorkHour>>("/work-hours", payload);
  return data.data;
}

export async function deleteWorkHour(id: string) {
  const { data } = await request.delete<ApiResponse<{ success: boolean }>>(`/work-hours/${id}`);
  return data.data;
}

export async function getCaseWorkHourSummary(caseId: string) {
  const { data } = await request.get<ApiResponse<WorkHourSummary>>(`/work-hours/case/${caseId}/summary`);
  return data.data;
}
