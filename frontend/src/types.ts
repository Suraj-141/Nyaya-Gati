export type CaseType = 'criminal' | 'civil' | 'family' | 'commercial' | string;

export enum CaseStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  FILED = 'FILED',
  ACCEPTED = 'ACCEPTED',
  SCHEDULED = 'SCHEDULED',
  EVIDENCE = 'EVIDENCE',
  ARGUMENTS = 'ARGUMENTS',
  HEARING_IN_PROGRESS = 'HEARING_IN_PROGRESS',
  JUDGMENT = 'JUDGMENT',
  DISPOSED = 'DISPOSED',
}

export interface CaseOrder {
  date: string;
  pdf_url: string;
  title?: string;
  text?: string;
}

export interface CaseRemark {
  date: string;
  text: string;
  author: string;
}

export interface Case {
  id: number;
  case_number: string;
  case_title?: string;
  case_type: CaseType;
  filing_date: string;
  petitioner: { name: string; email?: string; phone?: string; [key: string]: any };
  respondent: { name: string; email?: string; phone?: string; [key: string]: any };
  lawyer_name?: string;
  judge_name?: string;
  status: CaseStatus;
  merit_score?: number;
  urgency_score: number;
  urgency_level?: 'Critical' | 'High' | 'Medium' | 'Low';
  predicted_hearings?: number;
  predicted_duration_months?: number;
  urgency_explanation?: string;
  ai_reasoning?: string;
  next_hearing_date?: string;
  courtroom?: string;
  petition_pdf_url?: string;
  orders?: CaseOrder[];
  remarks?: CaseRemark[];
}

export interface PriorityQueueResponse {
  cases: Case[];
  total_count: number;
  high_urgency_count: number;
  low_merit_count: number;
}
