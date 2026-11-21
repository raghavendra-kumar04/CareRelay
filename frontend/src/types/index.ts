export interface User {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export interface AuthPayload {
  user: User;
  accessToken: string;
}

export type FamilyRole = 'admin' | 'member';

export interface Family {
  _id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  inviteToken?: string;
  inviteTokenExpiresAt?: string | null;
}

export interface FamilySummary {
  family: Family;
  role: FamilyRole;
  joinedAt: string;
}

export interface FamilyMember {
  membershipId: string;
  role: FamilyRole;
  joinedAt: string;
  user: { _id: string; name: string; email: string; avatarColor: string } | null;
}

export interface FamilyDetail {
  family: Family;
  role: FamilyRole;
  members: FamilyMember[];
}

export interface InviteInfo {
  inviteToken: string;
  inviteTokenExpiresAt: string;
}

export interface JoinResult {
  family: Pick<Family, '_id' | 'name' | 'createdAt' | 'updatedAt'>;
  role: FamilyRole;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'appointment' | 'medication' | 'document' | 'transport' | 'communication' | 'other';

export interface TaskAssignee {
  _id: string;
  name: string;
  avatarColor: string;
}

export interface TaskNote {
  _id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  familyId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: TaskAssignee | null;
  createdBy: string;
  dueDate: string | null;
  completedAt: string | null;
  completionNote: string | null;
  notes: TaskNote[];
  relatedAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface TaskListFilters {
  status?: TaskStatus;
  assignedTo?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: TaskPriority;
  assignedTo: string;
  dueDate?: string | null;
}

export type TaskUpdateInput = Partial<TaskInput> & { status?: TaskStatus; completionNote?: string };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}


