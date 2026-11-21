import { isAxiosError } from 'axios';
import api from './api';
import type { Family, FamilyDetail, FamilyMember, FamilyRole, FamilySummary, InviteInfo, JoinResult } from '../types';

export async function createFamily(name: string): Promise<{ family: Family; role: FamilyRole }> {
  const response = await api.post<{ success: true; data: { family: Family; role: FamilyRole } }>(
    '/families',
    { name },
  );
  return response.data.data;
}

export async function getMyFamilies(): Promise<{ families: FamilySummary[] }> {
  const response = await api.get<{ success: true; data: { families: FamilySummary[] } }>('/families/mine');
  return response.data.data;
}

export async function getFamily(fid: string): Promise<FamilyDetail> {
  const response = await api.get<{ success: true; data: FamilyDetail }>(`/families/${fid}`);
  return response.data.data;
}

export async function getMembers(fid: string): Promise<{ members: FamilyMember[] }> {
  const response = await api.get<{ success: true; data: { members: FamilyMember[] } }>(
    `/families/${fid}/members`,
  );
  return response.data.data;
}

export async function regenerateInvite(fid: string): Promise<InviteInfo> {
  const response = await api.post<{ success: true; data: InviteInfo }>(`/families/${fid}/invite`);
  return response.data.data;
}

export async function joinByToken(token: string): Promise<JoinResult> {
  const response = await api.post<{ success: true; data: JoinResult }>(`/families/join/${token}`);
  return response.data.data;
}

export async function removeMember(
  fid: string,
  userId: string,
): Promise<{ userId: string; removed: true }> {
  const response = await api.delete<{ success: true; data: { userId: string; removed: true } }>(
    `/families/${fid}/members/${userId}`,
  );
  return response.data.data;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ error?: { message?: unknown } }>(err)) {
    const message = err.response?.data?.error?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function getApiErrorCode(err: unknown): string | null {
  if (isAxiosError<{ error?: { code?: unknown } }>(err)) {
    const code = err.response?.data?.error?.code;
    if (typeof code === 'string') return code;
  }
  return null;
}
