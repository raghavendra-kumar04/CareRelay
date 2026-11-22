import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/familyApi';
import type { Appointment, AppointmentInput, AppointmentStatus, PaginationMeta } from '../types';

export const appointmentKeys = {
  all: (fid: string) => ['family', fid, 'appointments'] as const,
  list: (fid: string, filters?: Record<string, unknown>) =>
    ['family', fid, 'appointments', filters] as const,
};

export interface AppointmentListResponse {
  appointments: Appointment[];
  pagination: PaginationMeta;
}

export function useAppointments(
  fid: string,
  filters?: { status?: AppointmentStatus; assignedTo?: string; patientId?: string; upcoming?: boolean; page?: number; limit?: number }
) {
  return useQuery({
    queryKey: appointmentKeys.list(fid, filters),
    queryFn: async (): Promise<AppointmentListResponse> => {
      const response = await api.get(`/families/${fid}/appointments`, { params: filters });
      return response.data.data as AppointmentListResponse;
    },
    enabled: Boolean(fid),
    staleTime: 15000,
  });
}

export function useCreateAppointment(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AppointmentInput) => {
      const response = await api.post(`/families/${fid}/appointments`, data);
      return response.data.data.appointment as Appointment;
    },
    onSuccess: (appointment) => {
      toast.success(`Appointment "${appointment.title}" scheduled`);
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['family', fid, 'snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to schedule appointment'));
    },
  });
}

export function useUpdateAppointment(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentInput> }) => {
      const response = await api.patch(`/families/${fid}/appointments/${id}`, data);
      return response.data.data.appointment as Appointment;
    },
    onSuccess: (appointment) => {
      toast.success(`Appointment "${appointment.title}" updated`);
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['family', fid, 'snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update appointment'));
    },
  });
}

export function useDeleteAppointment(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/families/${fid}/appointments/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Appointment removed');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all(fid) });
      queryClient.invalidateQueries({ queryKey: ['family', fid, 'snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['activities', fid] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to remove appointment'));
    },
  });
}
