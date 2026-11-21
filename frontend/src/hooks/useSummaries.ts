import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/familyApi';
import type { AiSummary, SummarySourceActivity } from '../types/summary';

export const summaryKeys = {
  all: (fid: string) => ['summaries', fid] as const,
  list: (fid: string, page: number) => ['summaries', fid, 'list', page] as const,
  detail: (fid: string, id: string) => ['summaries', fid, 'detail', id] as const,
};

export interface SummaryPagination {
  page: number;
  limit: number;
  total: number;
}

export function useSummaryList(fid: string, page: number) {
  return useQuery({
    queryKey: summaryKeys.list(fid, page),
    queryFn: async (): Promise<{ summaries: AiSummary[]; pagination: SummaryPagination }> => {
      const response = await api.get(`/families/${fid}/summaries`, { params: { page } });
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
    mutationFn: async (): Promise<AiSummary> => {
      const response = await api.post(`/families/${fid}/summaries/generate`);
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
