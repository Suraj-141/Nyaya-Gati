import axios from 'axios';
import { Case, CaseStatus, PriorityQueueResponse } from '../types';

// Use environment variable or default to local development URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const caseAPI = {
  getPriorityQueue: async (params?: any): Promise<PriorityQueueResponse> => {
    try {
      const { data } = await api.get('/cases/priority-queue', { params });
      return data;
    } catch (error) {
      console.warn("API failed, using mock data for demonstration", error);
      return {
        cases: [MOCK_CASE_DETAIL],
        total_count: 1,
        high_urgency_count: 1,
        low_merit_count: 0
      };
    }
  },

  getCaseByNumber: async (caseNumber: string): Promise<Case> => {
    try {
      // In real scenario, search by number or pass number to details
      const { data } = await api.get(`/cases/search?q=${caseNumber}`);
      return data[0] || MOCK_CASE_DETAIL;
    } catch (error) {
      return MOCK_CASE_DETAIL;
    }
  },

  getCaseById: async (id: number): Promise<Case> => {
    const { data } = await api.get(`/cases/${id}`);
    return data;
  },

  updateCase: async (id: number, update: any) => {
    const { data } = await api.patch(`/cases/${id}`, update);
    return data;
  },

  overridePriority: async (caseId: number, newScore: number, reason: string) => {
    const { data } = await api.post(`/cases/${caseId}/override-priority`, {
      new_urgency_score: newScore,
      reason
    });
    return data;
  },

  uploadDocument: async (caseId: number, file: File, docType: string) => {
    const formData = new FormData();
    formData.append('document', file);
    const { data } = await api.post(`/cases/${caseId}/documents?doc_type=${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  getSimilarCases: async (caseId: number, limit: number = 3): Promise<any[]> => {
    try {
      const { data } = await api.get(`/cases/${caseId}/similar?limit=${limit}`);
      return data;
    } catch (error) {
      console.warn("Similarity API failed, returning mocks", error);
      return [
        {
          filename: "State_Of_UP_vs_Anoop_Kumar_on_20_May_2015_1.PDF",
          year: 2015,
          judgment_date: "2015-05-20",
          petitioner: "State Of UP",
          respondent: "Anoop Kumar",
          case_type: "criminal",
          outcome_binary: 0,
          similarity_score: 0.85
        },
        {
          filename: "Union_Of_India_vs_Radha_Yadav_on_29_January_2019_1.PDF",
          year: 2019,
          judgment_date: "2019-01-29",
          petitioner: "Union Of India",
          respondent: "Radha Yadav",
          case_type: "civil",
          outcome_binary: 1,
          similarity_score: 0.72
        }
      ];
    }
  },

  getCaseSummary: async (caseId: number, sentences: number = 3): Promise<string> => {
    try {
      const { data } = await api.get(`/cases/${caseId}/summary?sentences=${sentences}`);
      return data.summary;
    } catch (error) {
      console.warn("Summary API failed", error);
      return "This is a mock summary. The petition revolves around a civil dispute regarding land ownership. Key evidence submitted includes a registered sale deed from 1985. The petitioner seeks immediate injunction against the respondent's construction activities.";
    }
  }
};


export const analyticsAPI = {
  getKPIs: async () => {
    // In a real system, these would be real endpoints
    // For the prototype, we can keep the mock data for visual richness 
    // or call the backend if implemented.
    return {
      pending_cases: 12847,
      pending_change: 3.2,
      disposal_rate: 68.4,
      disposal_change: 5.1,
      avg_duration_months: 14.2,
      duration_change: -2.3,
      undertrial_backlog: 3241,
      undertrial_change: -1.8,
      case_type_distribution: [
        { name: 'Civil', value: 42 },
        { name: 'Criminal', value: 31 },
        { name: 'Family', value: 16 },
        { name: 'Commercial', value: 11 },
      ],
    };
  },

  getTrends: async (_range: any) => ({
    monthly_stats: [
      { month: 'Jun', filed: 820, disposed: 610 },
      { month: 'Jul', filed: 780, disposed: 690 },
      { month: 'Aug', filed: 910, disposed: 720 },
      { month: 'Sep', filed: 870, disposed: 750 },
      { month: 'Oct', filed: 940, disposed: 810 },
      { month: 'Nov', filed: 860, disposed: 880 },
      { month: 'Dec', filed: 720, disposed: 840 },
      { month: 'Jan', filed: 800, disposed: 790 },
      { month: 'Feb', filed: 870, disposed: 820 },
      { month: 'Mar', filed: 950, disposed: 860 },
      { month: 'Apr', filed: 1010, disposed: 890 },
      { month: 'May', filed: 990, disposed: 920 },
    ],
  }),

  getJudgePerformance: async () => ({
    judges: [
      { id: 1, name: 'Hon. Justice A. Kumar',  assigned_cases: 142, disposed_this_month: 18, disposal_rate: 78.5, productivity_score: 88 },
      { id: 2, name: 'Hon. Justice P. Sharma', assigned_cases: 198, disposed_this_month: 12, disposal_rate: 52.3, productivity_score: 61 },
      { id: 3, name: 'Hon. Justice R. Singh',  assigned_cases: 115, disposed_this_month: 22, disposal_rate: 84.1, productivity_score: 94 },
      { id: 4, name: 'Hon. Justice S. Verma',  assigned_cases: 167, disposed_this_month: 9,  disposal_rate: 44.6, productivity_score: 48 },
      { id: 5, name: 'Hon. Justice N. Gupta',  assigned_cases: 131, disposed_this_month: 16, disposal_rate: 71.2, productivity_score: 77 },
    ],
  }),

  getFairnessAudit: async () => ({
    alerts: [
      { message: 'Cases with unrepresented litigants take 2.4x longer on average.' },
      { message: 'Criminal cases filed in Q4 show 18% lower disposal rates — possible seasonal understaffing.' },
    ],
    demographics: [
      { group: 'With Legal Aid',    avg_duration_months: 11.2 },
      { group: 'Private Counsel',   avg_duration_months: 14.8 },
      { group: 'Self-Represented',  avg_duration_months: 22.4 },
    ],
  }),

  getBottleneckAnalysis: async () => ({
    bottleneck_stage: 'Evidence Submission',
    stages: [
      { stage: 'Filed',     count: 12847 },
      { stage: 'Evidence',  count: 9210  },
      { stage: 'Arguments', count: 4380  },
      { stage: 'Judgment',  count: 1120  },
      { stage: 'Disposed',  count: 680   },
    ],
  }),

  exportData: async (_range: any): Promise<string> => {
    const rows = [
      'Month,Filed,Disposed,PendingCases,DisposalRate',
      'Jan 2024,800,790,12900,67.2',
      'Feb 2024,870,820,12950,68.1',
      'Mar 2024,950,860,13040,68.4',
      'Apr 2024,1010,890,13160,68.9',
      'May 2024,990,920,13230,69.2',
    ];
    return rows.join('\n');
  },
};

// ─── Internal Mock Data ──────────────────────────────────────────────────────
const MOCK_CASE_DETAIL: Case = {
  id: 101,
  case_number: 'DEL/2024/0912',
  case_type: 'civil',
  filing_date: '2024-01-15T09:00:00Z',
  petitioner: { name: 'State of Delhi' },
  respondent: { name: 'R.K. Industries' },
  status: CaseStatus.ARGUMENTS,
  merit_score: 92.5,
  urgency_score: 185.0,
  predicted_hearings: 6,
  predicted_duration_months: 8.5,
  urgency_explanation: 'High priority environmental case. Industrial pollution affecting 10,000+ residents.',
  next_hearing_date: '2024-07-22T10:30:00Z',
  courtroom: 'Court Hall 3, Block B',
  petition_pdf_url: 'https://storage.nyayagati.in/mock_petition.pdf',
  orders: [
    { date: '2024-03-10T00:00:00Z', pdf_url: '#', title: 'Interim Stay Order' },
    { date: '2024-05-01T00:00:00Z', pdf_url: '#', title: 'Direction for Evidence Submission' },
  ]
};
