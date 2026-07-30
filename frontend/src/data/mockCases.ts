import { Case, CaseStatus } from '../types';

// Registered accounts — must match users.ts
// Judges:   justice.kumar@nyaya.in | justice.sharma@nyaya.in | justice.singh@nyaya.in
// Lawyers:  adv.priya@nyaya.in     | adv.vikram@nyaya.in     | adv.ananya@nyaya.in
// Litigants (by name): Rajesh Sharma | Meena Desai | Vikram Verma

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateMockCases = (): Case[] => ([

  // ─── JUDGE: justice.kumar@nyaya.in | LAWYER: adv.priya@nyaya.in ──────────────

  {
    id: 1, case_number: "CIV/2026/00001", case_type: "labour dispute", court_type: "civil",
    filing_date: "2026-02-09",
    petitioner: { name: "Rajesh Sharma" }, respondent: { name: "National Textile Co." },
    lawyer_name: "adv.priya@nyaya.in", judge_name: "justice.kumar@nyaya.in",
    status: CaseStatus.ACCEPTED, merit_score: 77, urgency_score: 66,
    age_score: 1.0, vulnerability_score: 0.6, complexity_score: 0.4, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 11, predicted_duration_months: 24, resubmission_count: 0,
    ai_reasoning: "Wrongful termination with strong paper evidence. IDA Section 25-F non-compliance detected.",
    history: [{ date: "2026-02-09T09:00:00Z", title: "Case Filed", description: "Petition filed by Rajesh Sharma.", icon: "FileText" }]
  },
  {
    id: 2, case_number: "CIV/2026/00002", case_type: "Property dispute", court_type: "civil",
    filing_date: "2026-01-15",
    petitioner: { name: "Rajesh Sharma" }, respondent: { name: "DDA Housing Board" },
    lawyer_name: "adv.priya@nyaya.in", judge_name: "justice.kumar@nyaya.in",
    status: CaseStatus.EVIDENCE, merit_score: 82, urgency_score: 74,
    age_score: 0.8, vulnerability_score: 0.5, complexity_score: 0.6, case_type_weight: 0.5,
    urgency_level: "High", predicted_hearings: 8, predicted_duration_months: 18, resubmission_count: 0,
    ai_reasoning: "Property registration dispute involving a registered 1992 sale deed. Title dispute favours petitioner based on chain of ownership.",
    history: [{ date: "2026-01-15T10:00:00Z", title: "Case Filed", description: "Petition filed regarding land ownership.", icon: "FileText" }]
  },
  {
    id: 3, case_number: "CIV/2026/00003", case_type: "child custody", court_type: "civil",
    filing_date: "2026-03-20",
    petitioner: { name: "Priya Desai" }, respondent: { name: "Arun Desai" },
    lawyer_name: "adv.priya@nyaya.in", judge_name: "justice.kumar@nyaya.in",
    status: CaseStatus.PENDING_REVIEW, merit_score: 68, urgency_score: 88,
    age_score: 0.3, vulnerability_score: 0.9, complexity_score: 0.5, case_type_weight: 0.8,
    urgency_level: "High", predicted_hearings: 6, predicted_duration_months: 10, resubmission_count: 0,
    ai_reasoning: "Child welfare is at critical risk. Minor's best interest must be the paramount consideration per Guardian & Wards Act.",
    history: [{ date: "2026-03-20T11:00:00Z", title: "Case Filed", description: "Petition filed for custody of minor child.", icon: "FileText" }]
  },

  // ─── JUDGE: justice.sharma@nyaya.in | LAWYER: adv.vikram@nyaya.in ────────────

  {
    id: 4, case_number: "COM/2026/00004", case_type: "contract breach", court_type: "commercial",
    filing_date: "2026-01-08",
    petitioner: { name: "Global Logistics Pvt Ltd" }, respondent: { name: "Meena Desai" },
    lawyer_name: "adv.vikram@nyaya.in", judge_name: "justice.sharma@nyaya.in",
    status: CaseStatus.ARGUMENTS, merit_score: 91, urgency_score: 112,
    age_score: 0.7, vulnerability_score: 0.2, complexity_score: 0.8, case_type_weight: 0.6,
    urgency_level: "High", predicted_hearings: 7, predicted_duration_months: 12, resubmission_count: 0,
    ai_reasoning: "Clear contract breach with invoice documentation. Respondent failed to deliver per agreed SLA. High recovery probability.",
    history: [{ date: "2026-01-08T09:30:00Z", title: "Case Filed", description: "Commercial dispute filed by Global Logistics.", icon: "FileText" }]
  },
  {
    id: 5, case_number: "COM/2026/00005", case_type: "fraud", court_type: "commercial",
    filing_date: "2026-02-20",
    petitioner: { name: "Meena Desai" }, respondent: { name: "Rajan Finance Corp." },
    lawyer_name: "adv.vikram@nyaya.in", judge_name: "justice.sharma@nyaya.in",
    status: CaseStatus.SCHEDULED, merit_score: 85, urgency_score: 95,
    age_score: 0.6, vulnerability_score: 0.7, complexity_score: 0.7, case_type_weight: 0.7,
    urgency_level: "High", predicted_hearings: 9, predicted_duration_months: 15, resubmission_count: 0,
    next_hearing_date: "2026-08-05T10:30:00Z", courtroom: "Court Hall 2, Block A",
    ai_reasoning: "Fraudulent loan agreement detected. Multiple discrepancies in documentation. Strong case for petitioner.",
    history: [{ date: "2026-02-20T10:00:00Z", title: "Case Filed", description: "Fraud petition filed by Meena Desai.", icon: "FileText" }]
  },
  {
    id: 6, case_number: "COM/2026/00006", case_type: "environmental violation", court_type: "commercial",
    filing_date: "2025-12-10",
    petitioner: { name: "Residents of Sec-15" }, respondent: { name: "Anil Industries Ltd." },
    lawyer_name: "adv.vikram@nyaya.in", judge_name: "justice.sharma@nyaya.in",
    status: CaseStatus.JUDGMENT, merit_score: 93, urgency_score: 178,
    age_score: 0.9, vulnerability_score: 0.9, complexity_score: 0.5, case_type_weight: 0.9,
    urgency_level: "Critical", predicted_hearings: 14, predicted_duration_months: 8, resubmission_count: 0,
    ai_reasoning: "Critical environmental case. Industrial discharge affecting 10,000+ residents. PCB violation under EP Act confirmed.",
    history: [{ date: "2025-12-10T09:00:00Z", title: "Case Filed", description: "Environmental petition filed.", icon: "FileText" }]
  },

  // ─── JUDGE: justice.singh@nyaya.in | LAWYER: adv.ananya@nyaya.in ─────────────

  {
    id: 7, case_number: "LAB/2026/00007", case_type: "labour dispute", court_type: "civil",
    filing_date: "2026-03-01",
    petitioner: { name: "Vikram Verma" }, respondent: { name: "HCL Technologies" },
    lawyer_name: "adv.ananya@nyaya.in", judge_name: "justice.singh@nyaya.in",
    status: CaseStatus.PENDING_REVIEW, merit_score: 72, urgency_score: 58,
    age_score: 0.4, vulnerability_score: 0.4, complexity_score: 0.5, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 8, predicted_duration_months: 14, resubmission_count: 0,
    ai_reasoning: "Employee termination without due process. ID Act compliance review required. Partial merit pending further evidence.",
    history: [{ date: "2026-03-01T09:00:00Z", title: "Case Filed", description: "Labour dispute filed by Vikram Verma.", icon: "FileText" }]
  },
  {
    id: 8, case_number: "CIV/2026/00008", case_type: "Property dispute", court_type: "civil",
    filing_date: "2025-11-05",
    petitioner: { name: "Vikram Verma" }, respondent: { name: "Sneha Joshi" },
    lawyer_name: "adv.ananya@nyaya.in", judge_name: "justice.singh@nyaya.in",
    status: CaseStatus.JUDGMENT, merit_score: 87, urgency_score: 50,
    age_score: 0.25, vulnerability_score: 0.8, complexity_score: 0.7, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 4, predicted_duration_months: 17, resubmission_count: 0,
    ai_reasoning: "Ancestral property dispute with registered sale deed evidence. Judgement reserved pending final written submissions.",
    history: [{ date: "2025-11-05T10:00:00Z", title: "Case Filed", description: "Property dispute petition filed.", icon: "FileText" }]
  },
  {
    id: 9, case_number: "FAM/2026/00009", case_type: "divorce", court_type: "family",
    filing_date: "2026-04-10",
    petitioner: { name: "Anita Kapoor" }, respondent: { name: "Suresh Kapoor" },
    lawyer_name: "adv.ananya@nyaya.in", judge_name: "justice.singh@nyaya.in",
    status: CaseStatus.EVIDENCE, merit_score: 64, urgency_score: 42,
    age_score: 0.2, vulnerability_score: 0.6, complexity_score: 0.3, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 6, predicted_duration_months: 10, resubmission_count: 0,
    ai_reasoning: "Mutual consent divorce petition. Mediation recommended prior to formal proceedings.",
    history: [{ date: "2026-04-10T11:00:00Z", title: "Case Filed", description: "Divorce petition filed under Section 13 HMA.", icon: "FileText" }]
  },

  // ─── Additional cross-distributed cases ────────────────────────────────────

  {
    id: 10, case_number: "CIV/2026/00010", case_type: "contract breach", court_type: "civil",
    filing_date: "2026-01-22",
    petitioner: { name: "Rajesh Sharma" }, respondent: { name: "Omega Builders Ltd." },
    lawyer_name: "adv.priya@nyaya.in", judge_name: "justice.kumar@nyaya.in",
    status: CaseStatus.SCHEDULED, merit_score: 79, urgency_score: 61,
    age_score: 0.5, vulnerability_score: 0.4, complexity_score: 0.5, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 7, predicted_duration_months: 13, resubmission_count: 0,
    next_hearing_date: "2026-08-12T10:00:00Z", courtroom: "Court Hall 1, Block C",
    ai_reasoning: "Construction contract dispute. Builder defaulted on delivery. RERA violation evident in documentation.",
    history: [{ date: "2026-01-22T09:00:00Z", title: "Case Filed", description: "Contract breach petition filed.", icon: "FileText" }]
  },
  {
    id: 11, case_number: "COM/2026/00011", case_type: "cheque dishonour", court_type: "commercial",
    filing_date: "2026-04-01",
    petitioner: { name: "Meena Desai" }, respondent: { name: "Prakash Trading Co." },
    lawyer_name: "adv.vikram@nyaya.in", judge_name: "justice.sharma@nyaya.in",
    status: CaseStatus.FILED, merit_score: 94, urgency_score: 120,
    age_score: 0.2, vulnerability_score: 0.5, complexity_score: 0.3, case_type_weight: 0.6,
    urgency_level: "High", predicted_hearings: 4, predicted_duration_months: 8, resubmission_count: 0,
    ai_reasoning: "Sec 138 NI Act. Dishonoured cheque of ₹12.5L. Strong recovery case with bank records and legal notice history.",
    history: [{ date: "2026-04-01T09:00:00Z", title: "Case Filed", description: "Cheque dishonour complaint filed.", icon: "FileText" }]
  },
  {
    id: 12, case_number: "LAB/2026/00012", case_type: "wage theft", court_type: "civil",
    filing_date: "2026-05-05",
    petitioner: { name: "Vikram Verma" }, respondent: { name: "BuildRight Construction" },
    lawyer_name: "adv.ananya@nyaya.in", judge_name: "justice.singh@nyaya.in",
    status: CaseStatus.PENDING_REVIEW, merit_score: 71, urgency_score: 55,
    age_score: 0.1, vulnerability_score: 0.7, complexity_score: 0.4, case_type_weight: 0.5,
    urgency_level: "Medium", predicted_hearings: 5, predicted_duration_months: 9, resubmission_count: 0,
    ai_reasoning: "Three months unpaid wages. Payment Wages Act violation. Clear case for petitioner with salary slips as evidence.",
    history: [{ date: "2026-05-05T09:00:00Z", title: "Case Filed", description: "Wage theft petition filed.", icon: "FileText" }]
  },
  {
    id: 13, case_number: "CIV/2026/00013", case_type: "Rent dispute", court_type: "civil",
    filing_date: "2026-02-28",
    petitioner: { name: "Ravi Nair" }, respondent: { name: "Priya Menon" },
    lawyer_name: "adv.priya@nyaya.in", judge_name: "justice.kumar@nyaya.in",
    status: CaseStatus.DISPOSED, merit_score: 88, urgency_score: 45,
    age_score: 1.0, vulnerability_score: 0.3, complexity_score: 0.2, case_type_weight: 0.4,
    urgency_level: "Low", predicted_hearings: 3, predicted_duration_months: 6, resubmission_count: 0,
    ai_reasoning: "Eviction matter resolved via court mediation. Tenant given 90-day notice period.",
    history: [{ date: "2026-02-28T09:00:00Z", title: "Case Filed", description: "Rent dispute petition filed.", icon: "FileText" }]
  },
]);
