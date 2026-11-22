export type SummaryStatus = 'generating' | 'ready' | 'failed';

export interface SummaryItem {
  text: string;
  sourceIds: string[];
}

export interface SummaryContent {
  recentlyCompleted: SummaryItem[];
  pending: SummaryItem[];
  overdue: SummaryItem[];
  upcomingAppointments: SummaryItem[];
  suggestedAdminActions: SummaryItem[];
}

// Named AiSummary to avoid clashing with FamilySummary in types/index.ts.
export interface AiSummary {
  _id: string;
  familyId: string;
  status: SummaryStatus;
  errorCode: string | null;
  periodStart: string;
  periodEnd: string;
  content: SummaryContent;
  disclaimer: string;
  patientId?: string | null;
  patientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummarySourceActivity {
  _id: string;
  actorName: string;
  entityType: string;
  entityTitle: string;
  action: string;
  createdAt: string;
}

export interface CareChatMessage {
  _id: string;
  familyId: string;
  sender: string;
  senderName: string;
  role: 'user' | 'assistant';
  message: string;
  patientId?: string | null;
  patientName?: string;
  createdAt: string;
}
