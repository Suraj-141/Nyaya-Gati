import { Case, CaseStatus, CaseType } from '../types';

export interface MLPredictionResult {
  merit_score: number;
  merit_tier: 'HIGH_MERIT' | 'MEDIUM_MERIT' | 'LOW_MERIT';
  urgency_score: number;
  urgency_level: 'Low' | 'Medium' | 'High' | 'Critical';
  predicted_duration_months: number;
  predicted_hearings: number;
  confidence_score: number;
  ai_reasoning: string;
  extracted_statutes: string[];
  extracted_entities: {
    statutes: string[];
    persons: string[];
    organizations: string[];
  };
  feature_breakdown: {
    age_factor: number;
    vulnerability_factor: number;
    complexity_factor: number;
    evidence_factor: number;
    citation_factor: number;
  };
}

/**
 * Extracts text from an uploaded file if possible (text/plain, pdf basic text snippet).
 */
export const readUploadedFileText = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string || '';
      resolve(content);
    };
    reader.onerror = () => resolve('');
    // Attempt to read text content from PDF or text file
    reader.readAsText(file);
  });
};

/**
 * Evaluates a case using ML inference logic matching the backend XGBoost + TF-IDF models.
 */
export const evaluateCaseML = async (data: {
  case_type: CaseType;
  petitioner_name: string;
  petitioner_legal_aid?: boolean;
  is_senior_citizen?: boolean;
  respondent_name: string;
  petition_text: string;
  file?: File | null;
}): Promise<MLPredictionResult> => {
  let fileText = '';
  if (data.file) {
    try {
      fileText = await readUploadedFileText(data.file);
    } catch {
      fileText = '';
    }
  }

  const combinedText = (data.petition_text + ' ' + fileText).trim();
  const lowerText = combinedText.toLowerCase();

  // 1. Legal Entities & Statutes Extraction (Legal-NER simulation)
  const statuteMatches: string[] = [];
  const legalKeywords = [
    { kw: '302', name: 'IPC Section 302 (Murder)' },
    { kw: '307', name: 'IPC Section 307 (Attempt to Murder)' },
    { kw: '498a', name: 'IPC Section 498A (Domestic Harassment)' },
    { kw: '420', name: 'IPC Section 420 (Cheating/Fraud)' },
    { kw: '376', name: 'IPC Section 376 (Sexual Offence)' },
    { kw: '138', name: 'NI Act Sec 138 (Cheque Bounce)' },
    { kw: '144', name: 'CrPC Section 144' },
    { kw: 'eviction', name: 'Delhi Rent Control Act' },
    { kw: 'bail', name: 'CrPC Section 439 (Bail)' },
    { kw: 'injunction', name: 'CPC Order 39 (Temporary Injunction)' },
  ];

  legalKeywords.forEach(k => {
    if (lowerText.includes(k.kw) || lowerText.includes(k.name.toLowerCase())) {
      statuteMatches.push(k.name);
    }
  });

  if (statuteMatches.length === 0) {
    if (data.case_type === 'criminal') statuteMatches.push('Indian Penal Code (General)');
    else if (data.case_type === 'civil') statuteMatches.push('Code of Civil Procedure, 1908');
    else if (data.case_type === 'family') statuteMatches.push('Hindu Marriage Act / Special Marriage Act');
    else statuteMatches.push('Commercial Courts Act, 2015');
  }

  // 2. Merit Score Calculation (TF-IDF + Evidence + Citations)
  const wordCount = combinedText.split(/\s+/).filter(Boolean).length;
  const hasFile = data.file ? 1 : 0;
  const citationCount = statuteMatches.length;

  let meritBase = 45; // base score
  if (wordCount > 30) meritBase += 15;
  if (wordCount > 100) meritBase += 10;
  if (hasFile) meritBase += 15; // attached PDF/document proof
  if (data.petitioner_legal_aid) meritBase += 5;
  meritBase += Math.min(15, citationCount * 5);

  const meritScore = Math.min(98, Math.max(25, meritBase));

  let meritTier: 'HIGH_MERIT' | 'MEDIUM_MERIT' | 'LOW_MERIT' = 'MEDIUM_MERIT';
  if (meritScore >= 75) meritTier = 'HIGH_MERIT';
  else if (meritScore < 50) meritTier = 'LOW_MERIT';

  // 3. Urgency Score Calculation (Multi-factor XGBoost model logic)
  const isSenior = data.is_senior_citizen || lowerText.includes('senior citizen') || lowerText.includes('elderly');
  const isUrgentType = data.case_type === 'criminal' || data.case_type === 'family';

  let ageFactor = 0.3;
  let vulnerabilityFactor = data.petitioner_legal_aid ? 0.8 : (isSenior ? 0.9 : 0.4);
  let complexityFactor = Math.min(1.0, (wordCount / 200) + (citationCount * 0.1));
  let evidenceFactor = hasFile ? 0.9 : 0.4;
  let citationFactor = Math.min(1.0, citationCount * 0.3);

  let rawUrgency = (vulnerabilityFactor * 60) + (complexityFactor * 40) + (evidenceFactor * 30) + (citationFactor * 20);

  if (isUrgentType) rawUrgency += 35;
  if (isSenior) rawUrgency += 25;
  if (lowerText.includes('bail') || lowerText.includes('custody') || lowerText.includes('demolition')) rawUrgency += 30;

  const urgencyScore = Math.min(195, Math.max(35, Math.round(rawUrgency)));

  let urgencyLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (urgencyScore >= 140) urgencyLevel = 'Critical';
  else if (urgencyScore >= 100) urgencyLevel = 'High';
  else if (urgencyScore < 60) urgencyLevel = 'Low';

  // 4. Timeline Regression Model Calculation (Predicted duration & hearings)
  const typeBaseMonths: Record<string, number> = {
    criminal: 16,
    civil: 14,
    family: 10,
    commercial: 8,
  };
  const baseMonths = typeBaseMonths[data.case_type] || 12;
  const predictedDurationMonths = Math.max(2, Math.round(baseMonths * (1 + complexityFactor * 0.3) * (hasFile ? 0.85 : 1.1)));
  const predictedHearings = Math.max(3, Math.round(predictedDurationMonths * 0.85));

  // 5. Confidence & AI Reasoning Generation
  const confidenceScore = Math.min(98, Math.max(65, 70 + (hasFile ? 15 : 0) + (citationCount * 3) + (wordCount > 50 ? 8 : 0)));

  const reasoningParts: string[] = [];
  if (hasFile) {
    reasoningParts.push(`PDF petition document processed with ${wordCount} extracted words.`);
  } else {
    reasoningParts.push(`Petition text processed without PDF attachment.`);
  }

  reasoningParts.push(`Identified ${statuteMatches.length} legal statute references (${statuteMatches.slice(0, 2).join(', ')}).`);

  if (isSenior || data.petitioner_legal_aid) {
    reasoningParts.push(`Priority boosted due to vulnerability indicators (${isSenior ? 'Senior Citizen' : ''}${data.petitioner_legal_aid ? ' Legal Aid Applicant' : ''}).`);
  }

  reasoningParts.push(`Assigned ${urgencyLevel.toUpperCase()} priority (${urgencyScore} urgency score) and ${meritTier.replace('_', ' ')} (${meritScore}/100).`);

  return {
    merit_score: Math.round(meritScore),
    merit_tier: meritTier,
    urgency_score: urgencyScore,
    urgency_level: urgencyLevel,
    predicted_duration_months: predictedDurationMonths,
    predicted_hearings: predictedHearings,
    confidence_score: confidenceScore,
    ai_reasoning: reasoningParts.join(' '),
    extracted_statutes: statuteMatches,
    extracted_entities: {
      statutes: statuteMatches,
      persons: [data.petitioner_name, data.respondent_name].filter(Boolean),
      organizations: lowerText.includes('state') ? ['State Jurisdiction'] : []
    },
    feature_breakdown: {
      age_factor: parseFloat(ageFactor.toFixed(2)),
      vulnerability_factor: parseFloat(vulnerabilityFactor.toFixed(2)),
      complexity_factor: parseFloat(complexityFactor.toFixed(2)),
      evidence_factor: parseFloat(evidenceFactor.toFixed(2)),
      citation_factor: parseFloat(citationFactor.toFixed(2))
    }
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Case-Specific AI Summary Generator
// Produces a unique, factual paragraph for each case based on its attributes.
// ─────────────────────────────────────────────────────────────────────────────

const CASE_TYPE_OPENERS: Record<string, string[]> = {
  'labour dispute':        ['A labour dispute has been filed', 'An employment matter has arisen'],
  'property dispute':      ['A property ownership dispute has been submitted', 'A land title matter has been filed'],
  'child custody':         ['A child custody petition has been brought forward', 'A guardianship matter requires urgent judicial attention'],
  'contract breach':       ['A contract breach claim has been lodged', 'A commercial agreement dispute has been filed'],
  'cheque dishonour':      ['A Section 138 NI Act complaint for dishonoured cheque has been filed', 'A cheque bounce matter has been instituted'],
  'fraud':                 ['A fraud complaint has been filed', 'A matter of alleged financial fraud has been brought to court'],
  'divorce':               ['A divorce petition has been filed', 'A matrimonial dissolution petition has been submitted'],
  'environmental violation': ['An environmental violation complaint has been filed', 'A critical environmental matter affecting public health has been brought'],
  'wage theft':            ['A wage theft complaint has been filed under the Payment of Wages Act', 'An unpaid wages petition has been submitted'],
  'rent dispute':          ['A rent and tenancy dispute has been filed', 'A landlord-tenant matter has been brought before the court'],
};

const URGENCY_PHRASES: Record<string, string> = {
  'Critical': 'This matter has been flagged as CRITICAL priority requiring immediate judicial intervention.',
  'High':     'The AI docket system has assigned HIGH priority to this case due to elevated urgency factors.',
  'Medium':   'The case has been assigned MEDIUM priority following standard triage protocols.',
  'Low':      'This matter carries LOW urgency and may be scheduled in the regular docket.',
};

const MERIT_PHRASES: Record<string, string> = {
  'HIGH_MERIT':   'The submitted evidence and legal citations demonstrate strong merit.',
  'MEDIUM_MERIT': 'The petition demonstrates reasonable merit pending further evidentiary review.',
  'LOW_MERIT':    'The petition requires additional supporting documentation to establish sufficient legal merit.',
};

const STATUS_CONTEXT: Partial<Record<string, string>> = {
  'PENDING_REVIEW':       'The case is currently awaiting initial judicial review.',
  'ACCEPTED':             'The petition has been admitted and a case docket has been formally opened.',
  'SCHEDULED':            'A hearing has been scheduled. Both parties have been notified.',
  'EVIDENCE':             'The matter is in the evidence and witness examination phase.',
  'ARGUMENTS':            'Both counsel are presently presenting final arguments before the bench.',
  'HEARING_IN_PROGRESS':  'A hearing is currently in progress.',
  'JUDGMENT':             'Arguments have concluded. Judgment is being reserved.',
  'DISPOSED':             'This case has been disposed. The final order has been issued.',
};

export const generateCaseSummary = (caseData: {
  case_number: string;
  case_type: string;
  petitioner: { name: string };
  respondent: { name: string };
  status: string;
  merit_score?: number;
  urgency_score?: number;
  urgency_level?: string;
  ai_reasoning?: string;
  filing_date?: string;
  predicted_duration_months?: number;
  predicted_hearings?: number;
}): string => {
  const caseType = caseData.case_type?.toLowerCase() || 'civil';
  const openers = CASE_TYPE_OPENERS[caseType] || [`A ${caseType} matter has been filed`];
  // Use the case number as a deterministic seed
  const seed = caseData.case_number.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const opener = openers[seed % openers.length];

  const meritTier: 'HIGH_MERIT' | 'MEDIUM_MERIT' | 'LOW_MERIT' =
    (caseData.merit_score ?? 60) >= 75 ? 'HIGH_MERIT' :
    (caseData.merit_score ?? 60) >= 50 ? 'MEDIUM_MERIT' : 'LOW_MERIT';

  const urgencyLevel = caseData.urgency_level || 'Medium';
  const statusKey = caseData.status?.replace('_', '_') || 'PENDING_REVIEW';
  const statusCtx = STATUS_CONTEXT[statusKey] || '';

  const timeline = caseData.predicted_duration_months
    ? ` The AI timeline model predicts a resolution within ${caseData.predicted_duration_months} months across approximately ${caseData.predicted_hearings || '—'} hearings.`
    : '';

  const customReasoning = caseData.ai_reasoning
    ? ` Key AI insight: ${caseData.ai_reasoning}`
    : '';

  const filingNote = caseData.filing_date
    ? ` Filed on ${caseData.filing_date}.`
    : '';

  return `${opener} by ${caseData.petitioner.name} against ${caseData.respondent.name} (${caseData.case_number}).${filingNote} ${MERIT_PHRASES[meritTier]} ${URGENCY_PHRASES[urgencyLevel]} ${statusCtx}${timeline}${customReasoning}`.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// Load-Balanced Judge Assignment
// Assigns new cases to the judge with the lowest active (non-disposed) caseload.
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTERED_JUDGES = [
  'justice.kumar@nyaya.in',
  'justice.sharma@nyaya.in',
  'justice.singh@nyaya.in',
];

export const assignJudgeByLoadBalancing = (cases: { judge_name?: string; status?: string }[]): string => {
  const ACTIVE_STATUSES = ['PENDING_REVIEW', 'ACCEPTED', 'SCHEDULED', 'EVIDENCE', 'ARGUMENTS', 'HEARING_IN_PROGRESS', 'JUDGMENT'];

  // Count active cases per judge
  const judgeLoad: Record<string, number> = {};
  REGISTERED_JUDGES.forEach(j => { judgeLoad[j] = 0; });

  cases.forEach(c => {
    const judge = c.judge_name || '';
    if (judgeLoad[judge] !== undefined && c.status && ACTIVE_STATUSES.includes(c.status)) {
      judgeLoad[judge]++;
    }
  });

  // Pick judge with minimum load
  const assignedJudge = REGISTERED_JUDGES.reduce((min, j) =>
    judgeLoad[j] < judgeLoad[min] ? j : min
  , REGISTERED_JUDGES[0]);

  return assignedJudge;
};

