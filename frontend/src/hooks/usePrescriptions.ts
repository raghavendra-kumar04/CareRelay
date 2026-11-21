import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/familyApi';
import type { PaginationMeta, Prescription, PrescriptionInput } from '../types';

export const prescriptionKeys = {
  all: (fid: string) => ['family', fid, 'prescriptions'] as const,
  list: (fid: string, filters?: Record<string, unknown>) =>
    ['family', fid, 'prescriptions', filters] as const,
};

export interface PrescriptionListResponse {
  prescriptions: Prescription[];
  pagination: PaginationMeta;
}

export function usePrescriptions(fid: string, filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: prescriptionKeys.list(fid, filters),
    queryFn: async (): Promise<PrescriptionListResponse> => {
      const response = await api.get(`/families/${fid}/prescriptions`, { params: filters });
      return response.data.data as PrescriptionListResponse;
    },
    enabled: Boolean(fid),
    staleTime: 30000,
  });
}

export function useCreatePrescription(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PrescriptionInput) => {
      const response = await api.post(`/families/${fid}/prescriptions`, data);
      return response.data.data.prescription as Prescription;
    },
    onSuccess: (prescription) => {
      toast.success(`Prescription "${prescription.medicationName}" saved`);
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to save prescription'));
    },
  });
}

export function useUpdatePrescription(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PrescriptionInput> }) => {
      const response = await api.patch(`/families/${fid}/prescriptions/${id}`, data);
      return response.data.data.prescription as Prescription;
    },
    onSuccess: (prescription) => {
      toast.success(`Prescription "${prescription.medicationName}" updated`);
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update prescription'));
    },
  });
}

export function useDeletePrescription(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/families/${fid}/prescriptions/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Prescription deleted');
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to delete prescription'));
    },
  });
}
