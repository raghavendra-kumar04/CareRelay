import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { FamilySnapshot } from '../types';

export const snapshotKeys = {
  snapshot: (fid: string, patientId?: string | null) =>
    ['family', fid, 'snapshot', patientId || 'all'] as const,
};

export function useSnapshot(fid: string, patientId?: string | null) {
  return useQuery({
    queryKey: snapshotKeys.snapshot(fid, patientId),
    queryFn: async (): Promise<FamilySnapshot> => {
      const params = new URLSearchParams();
      if (patientId && patientId !== 'all') {
        params.append('patientId', patientId);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/families/${fid}/snapshot${qs}`);
      return response.data.data.snapshot as FamilySnapshot;
    },
    enabled: Boolean(fid),
    staleTime: 5000,
  });
}
