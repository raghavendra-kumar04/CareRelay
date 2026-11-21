import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { FamilySnapshot } from '../types';

export const snapshotKeys = {
  snapshot: (fid: string) => ['family', fid, 'snapshot'] as const,
};

export function useSnapshot(fid: string) {
  return useQuery({
    queryKey: snapshotKeys.snapshot(fid),
    queryFn: async (): Promise<FamilySnapshot> => {
      const response = await api.get(`/families/${fid}/snapshot`);
      return response.data.data.snapshot as FamilySnapshot;
    },
    enabled: Boolean(fid),
    staleTime: 30000,
  });
}
