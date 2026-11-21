import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ActivityFilters, ActivityItemData, PaginationMeta } from '../types';

export const activityKeys = {
  all: (fid: string) => ['activities', fid] as const,
  list: (fid: string, filters: ActivityFilters) => ['activities', fid, 'list', filters] as const,
};

export interface ActivityListResult {
  items: ActivityItemData[];
  pagination: PaginationMeta;
}

interface ActivityListResponse {
  success: true;
  data: ActivityItemData[];
  pagination: PaginationMeta;
}

function toQueryParams(filters: ActivityFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.entityType) params.entityType = filters.entityType;
  if (filters.actorId) params.actorId = filters.actorId;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;
  return params;
}

export function useActivities(fid: string, filters: ActivityFilters) {
  return useQuery({
    queryKey: activityKeys.list(fid, filters),
    queryFn: async (): Promise<ActivityListResult> => {
      const response = await api.get<ActivityListResponse>(`/families/${fid}/activities`, {
        params: toQueryParams(filters),
      });
      return { items: response.data.data, pagination: response.data.pagination };
    },
    enabled: Boolean(fid),
    placeholderData: keepPreviousData,
  });
}
