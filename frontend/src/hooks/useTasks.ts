import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/familyApi';
import type { PaginationMeta, Task, TaskInput, TaskListFilters, TaskUpdateInput } from '../types';

export const taskKeys = {
  all: (fid: string) => ['tasks', fid] as const,
  list: (fid: string, filters: TaskListFilters) => ['tasks', fid, 'list', filters] as const,
  detail: (fid: string, id: string) => ['tasks', fid, 'detail', id] as const,
};

export interface TaskListResult {
  tasks: Task[];
  pagination: PaginationMeta;
}

interface TaskListResponse {
  success: true;
  data: Task[];
  pagination: PaginationMeta;
}

function toQueryParams(filters: TaskListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.assignedTo) params.assignedTo = filters.assignedTo;
  if (filters.patientId) params.patientId = filters.patientId;
  if (filters.priority) params.priority = filters.priority;
  if (filters.category) params.category = filters.category;
  if (filters.overdue) params.overdue = 'true';
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;
  return params;
}

export function useTaskList(fid: string, filters: TaskListFilters) {
  return useQuery({
    queryKey: taskKeys.list(fid, filters),
    queryFn: async (): Promise<TaskListResult> => {
      const response = await api.get<TaskListResponse>(`/families/${fid}/tasks`, {
        params: toQueryParams(filters),
      });
      return { tasks: response.data.data, pagination: response.data.pagination };
    },
    enabled: Boolean(fid),
  });
}

export function useCreateTask(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput): Promise<Task> => {
      const response = await api.post<{ success: true; data: { task: Task } }>(
        `/families/${fid}/tasks`,
        input,
      );
      return response.data.data.task;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(fid) });
      toast.success('Task created');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not create task'));
    },
  });
}

export function useUpdateTask(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskUpdateInput }): Promise<Task> => {
      const response = await api.patch<{ success: true; data: { task: Task } }>(
        `/families/${fid}/tasks/${id}`,
        data,
      );
      return response.data.data.task;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(fid) });
      toast.success('Task updated');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not update task'));
    },
  });
}

export function useAddTaskNote(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }): Promise<Task> => {
      const response = await api.post<{ success: true; data: { task: Task } }>(
        `/families/${fid}/tasks/${id}/notes`,
        { text },
      );
      return response.data.data.task;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(fid) });
      toast.success('Note added');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not add note'));
    },
  });
}

export function useDeleteTask(fid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ taskId: string; deleted: true }> => {
      const response = await api.delete<{ success: true; data: { taskId: string; deleted: true } }>(
        `/families/${fid}/tasks/${id}`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(fid) });
      toast.success('Task deleted');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not delete task'));
    },
  });
}
