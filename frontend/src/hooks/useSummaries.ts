import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/familyApi';
import type { AiSummary, CareChatMessage, SummarySourceActivity } from '../types/summary';

export const summaryKeys = {
  all: (fid: string) => ['summaries', fid] as const,
  list: (fid: string, page: number, patientId?: string | null) =>
    ['summaries', fid, 'list', page, patientId || 'all'] as const,
  detail: (fid: string, id: string) => ['summaries', fid, 'detail', id] as const,
};

export interface SummaryPagination {
  page: number;
  limit: number;
  total: number;
}

export function useSummaryList(fid: string, page: number, patientId?: string | null) {
  return useQuery({
    queryKey: summaryKeys.list(fid, page, patientId),
    queryFn: async (): Promise<{ summaries: AiSummary[]; pagination: SummaryPagination }> => {
      const params: Record<string, string | number> = { page };
      if (patientId && patientId !== 'all') {
        params.patientId = patientId;
      }
      const response = await api.get(`/families/${fid}/summaries`, { params });
      return {
        summaries: response.data.data as AiSummary[],
        pagination: response.data.pagination as SummaryPagination,
      };
    },
    enabled: Boolean(fid),
    placeholderData: keepPreviousData,
  });
}

export function useSummaryDetail(fid: string, id: string | null) {
  return useQuery({
    queryKey: summaryKeys.detail(fid, id ?? ''),
    queryFn: async (): Promise<{ summary: AiSummary; sourceActivities: SummarySourceActivity[] }> => {
      const response = await api.get(`/families/${fid}/summaries/${id}`);
      return response.data.data as { summary: AiSummary; sourceActivities: SummarySourceActivity[] };
    },
    enabled: Boolean(fid) && Boolean(id),
  });
}

export function useGenerateSummary(fid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: { patientId?: string; patientName?: string }): Promise<AiSummary> => {
      const response = await api.post(`/families/${fid}/summaries/generate`, payload || {});
      return response.data.data.summary as AiSummary;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: summaryKeys.all(fid) });
      toast.success('Family update generated');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not generate the update'));
    },
  });
}

export function useCareChatHistory(fid: string) {
  return useQuery({
    queryKey: ['careChat', fid],
    queryFn: async (): Promise<CareChatMessage[]> => {
      const response = await api.get(`/families/${fid}/summaries/chat`);
      return response.data.data.messages as CareChatMessage[];
    },
    enabled: Boolean(fid),
  });
}

export function useSendChatMessage(fid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: string | { message: string; patientId?: string; patientName?: string }
    ): Promise<{ userMessage: CareChatMessage; assistantMessage: CareChatMessage }> => {
      const body = typeof payload === 'string' ? { message: payload } : payload;
      const response = await api.post(`/families/${fid}/summaries/chat`, body);
      return response.data.data as { userMessage: CareChatMessage; assistantMessage: CareChatMessage };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CareChatMessage[]>(['careChat', fid], (old = []) => {
        const existingIds = new Set(old.map((m) => m._id));
        const toAdd = [data.userMessage, data.assistantMessage].filter((m) => !existingIds.has(m._id));
        return [...old, ...toAdd];
      });
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not send message'));
    },
  });
}
