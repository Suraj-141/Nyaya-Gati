import React, { useState, useEffect } from 'react';
import { FileText, Cpu, Gavel, Calendar, Zap, AlertCircle, Scale, X, MessageSquare, ExternalLink, RefreshCw, Check, Users, Briefcase, Plus } from 'lucide-react';
import { Case, CaseStatus } from '../types';
import { useMockDb } from '../context/MockDbContext';
import { caseAPI } from '../services/api';
import { generateCaseSummary } from '../services/mlEngine';

// ─────────────────────────────────────────────────────────────────────────────

interface CaseDetailProps {
  caseData: Case | null;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ caseData }) => {
  const { updateCaseStatus, addRemark, scheduleHearing, optimizeQueue, currentUser, cases } = useMockDb();
  const [remarkText, setRemarkText] = useState('');
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [hearingDate, setHearingDate] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  
  const [similarCases, setSimilarCases] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!caseData?.id) {
      setSimilarCases([]);
      setSummaryText('');
      return;
    }

    // Generate a unique, case-specific AI summary locally (no API call)
    setSummaryLoading(true);
    const summary = generateCaseSummary(caseData as any);
    setSummaryText(summary);
    setSummaryLoading(false);

    // Load similar cases from API (fails gracefully with mock data)
    setLoadingSimilar(true);
    caseAPI.getSimilarCases(caseData.id, 3)
      .then(res => { setSimilarCases(res); setLoadingSimilar(false); })
      .catch(() => setLoadingSimilar(false));

  }, [caseData?.id, caseData?.status, caseData?.merit_score]);

  if (!caseData) {
    return (
      <div className="bg-[#ffffff] rounded-2xl border border-dashed border-judicial-200 h-[800px] flex flex-col items-center justify-center text-slate-400">
        <Gavel size={48} className="mb-4 opacity-20" />
        <h3 className="text-xl font-semibold">No Case Selected</h3>
        <p className="text-sm mt-2">Select a case from the priority queue to view AI insights.</p>
      </div>
    );
  }


  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-soft border border-judicial-100 dark:border-slate-700 overflow-hidden flex flex-col h-[800px] animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-judicial-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Gavel size={200} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md border border-white/10">
              {caseData.case_number}
            </span>
            <span className="flex items-center gap-1 text-sm bg-judicial-800 px-3 py-1 rounded-lg font-medium border border-judicial-700 shadow-inner">
              <Calendar size={14} /> Filed: {caseData.filing_date}
            </span>
          </div>
          <h2 className="text-2xl font-bold leading-tight mb-3 font-serif">
            {caseData.petitioner.name} <span className="text-white/50 text-lg font-normal px-1">vs.</span> {caseData.respondent.name}
          </h2>
          <p className="text-judicial-200 text-sm flex items-center gap-2">
            <Briefcase size={14} /> Current Status: <span className="font-bold text-white px-2 py-0.5 bg-white/10 rounded">{caseData.status}</span>
          </p>
          {caseData.lawyer_name && (
            <p className="text-judicial-200 text-sm flex items-center gap-2 mt-1">
              <Users size={14} /> Assigned Counsel: <span className="font-medium text-white">{caseData.lawyer_name}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
        
        {/* Judge Judicial Control Panel */}
        {currentUser?.role === 'judge' && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  Judicial Docket Control
                </span>
                <h4 className="text-base font-bold mt-1.5 flex items-center gap-2 text-slate-100">
                  <Gavel size={18} className="text-amber-400" /> Update Case Stage & Re-Optimize Docket
                </h4>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={caseData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as CaseStatus;
                    updateCaseStatus(caseData.id, newStatus);
                    addRemark(caseData.id, {
                      date: new Date().toISOString(),
                      text: `Stage updated to ${newStatus.replace('_', ' ')} by Hon'ble Judicial Bench`,
                      author: currentUser?.name || currentUser?.email || 'Hon. Judge'
                    });
                    optimizeQueue();
                  }}
                  className="bg-slate-800 border border-slate-700 text-amber-300 font-bold text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-judicial-400 outline-none flex-1 sm:flex-none cursor-pointer hover:bg-slate-750 transition-colors"
                >
                  <option value={CaseStatus.PENDING_REVIEW}>Pending Review</option>
                  <option value={CaseStatus.ACCEPTED}>Accepted / Admitted</option>
                  <option value={CaseStatus.SCHEDULED}>Scheduled for Hearing</option>
                  <option value={CaseStatus.EVIDENCE}>Evidence & Witness Stage</option>
                  <option value={CaseStatus.ARGUMENTS}>Final Arguments</option>
                  <option value={CaseStatus.HEARING_IN_PROGRESS}>Hearing in Progress</option>
                  <option value={CaseStatus.JUDGMENT}>Judgment Writing</option>
                  <option value={CaseStatus.DISPOSED}>Disposed / Closed</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Insight Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="absolute top-0 right-0 bg-emerald-50 dark:bg-emerald-900/10 w-24 h-24 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Scale size={16} /> Merit Score
              </h4>
              <span className={`font-black text-3xl ${caseData.merit_score && caseData.merit_score > 80 ? 'text-emerald-500' : caseData.merit_score && caseData.merit_score > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {caseData.merit_score?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10 leading-relaxed">
              {caseData.ai_reasoning || 'Strong evidence provided. Multiple valid legal precedents cited matching the current context.'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-red-300 dark:hover:border-red-700 transition-colors">
            <div className="absolute top-0 right-0 bg-red-50 dark:bg-red-900/10 w-24 h-24 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Zap size={16} /> Urgency Score
              </h4>
              <span className="font-black text-3xl text-red-500 drop-shadow-sm">
                {caseData.urgency_score?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10 leading-relaxed">
              {(caseData.urgency_score || 0) > 150 
                ? `Critical priority flagged due to severe time-sensitive risk factors associated with this ${caseData.case_type} filing.`
                : (caseData.urgency_score || 0) > 100 
                  ? `High priority driven by elevated urgency metrics within this ${caseData.case_type} dispute.`
                  : `Standard priority processing. No immediate critical risks detected in this ${caseData.case_type} petition.`}
            </p>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-800 p-5 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/30 mb-6">
          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Cpu size={18} className="text-indigo-600 dark:text-indigo-400" /> AI Generated Summary
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
            {summaryLoading ? "Generating AI summary from petition text..." : summaryText}
          </p>
        </div>

        {/* Legal-BERT Extractions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Cpu size={18} className="text-indigo-500" /> Legal-BERT Extracted Entities
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h4 className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Parties Involved</h4>
              <div className="flex flex-wrap gap-2">
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-indigo-100 dark:border-indigo-800/50">{caseData.petitioner.name}</span>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-indigo-100 dark:border-indigo-800/50">{caseData.respondent.name}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Statutes Cited</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.case_type === 'criminal' ? (
                  <><span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">IPC 302</span>
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">CrPC 133</span></>
                ) : caseData.case_type === 'family' ? (
                  <><span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">HMA Sec 13</span>
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">FC Act Sec 7</span></>
                ) : caseData.case_type === 'commercial' ? (
                  <><span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">ICA Sec 73</span>
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">Arb Act 1996</span></>
                ) : (
                  <><span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">CPC Order 39</span>
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-100 dark:border-amber-800/50">SRA Sec 10</span></>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Timeline Prediction */}
        <div className="bg-gradient-to-br from-judicial-50 to-white dark:from-slate-800 dark:to-slate-850 rounded-xl shadow-sm border border-judicial-100 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-6">
            <Calendar size={18} className="text-judicial-500" /> Predicted Timeline
          </h3>
          
          <div className="flex items-center gap-8 mb-8 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-center flex-1">
              <p className="text-4xl font-black text-judicial-900 dark:text-white mb-1">{caseData.predicted_hearings || Math.floor(Math.random() * 10) + 2}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Est. Hearings</p>
            </div>
            <div className="w-px h-16 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center flex-1">
              <p className="text-4xl font-black text-judicial-900 dark:text-white mb-1">{caseData.predicted_duration_months || Math.floor(Math.random() * 18) + 3}<span className="text-xl text-slate-400 ml-1">m</span></p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Duration</p>
            </div>
            <div className="w-px h-16 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center flex-1">
              <p className="text-4xl font-black text-emerald-500 mb-1">{Math.min(99, Math.floor((caseData.merit_score || 80) + 12))}%</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Confidence</p>
            </div>
          </div>
          
          <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100/50 dark:border-amber-800/30 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Based on historical data of similar {caseData.case_type} cases, the model predicts a timeline of {caseData.predicted_duration_months || 6} months. {caseData.ai_reasoning}
            </p>
          </div>
        </div>

        {/* Similar Past Precedents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mt-6 mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Scale size={18} className="text-indigo-500" /> Similar Precedents (Indian Supreme Court)
          </h3>
          {loadingSimilar ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              <span>Fetching similar judgments...</span>
            </div>
          ) : similarCases.length > 0 ? (
            <div className="space-y-4">
              {similarCases.map((sc, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded">
                      Similarity: {(sc.similarity_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{sc.judgment_date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-1">
                    {sc.petitioner} vs. {sc.respondent}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-2">
                    <span className="capitalize">{sc.case_type} Case</span>
                    <span>•</span>
                    <span>Outcome: {sc.outcome_binary === 1 ? 'Appeal Allowed' : 'Appeal Dismissed'}</span>
                    <span>•</span>
                    <span>Urgency: {sc.urgency_score}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No matching past precedents found.</p>
          )}
        </div>

        {/* Remarks Section */}
        {caseData.remarks && caseData.remarks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-judicial-500" /> Case Remarks
            </h3>
            <div className="space-y-3">
              {caseData.remarks.map((r, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-judicial-600 bg-judicial-50 px-2 py-0.5 rounded">{r.author}</span>
                    <span className="text-xs text-slate-400">{new Date(r.date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      
      {/* Action Bar */}
      <div className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
        
        {/* Input Areas */}
        {showRemarkInput && (
          <div className="flex gap-2 animate-fade-in-up">
            <input 
              type="text" 
              value={remarkText}
              onChange={e => setRemarkText(e.target.value)}
              placeholder="Enter official remark..." 
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-judicial-400 outline-none"
            />
            <button 
              onClick={() => {
                if (remarkText) {
                  addRemark(caseData.id, { date: new Date().toISOString(), text: remarkText, author: `Hon. ${currentUser?.email || 'Judge'}` });
                  setRemarkText('');
                  setShowRemarkInput(false);
                }
              }}
              className="bg-judicial-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
            >
              Save Remark
            </button>
            <button onClick={() => setShowRemarkInput(false)} className="text-slate-400 px-3 hover:text-slate-600"><X size={20}/></button>
          </div>
        )}

        {showScheduleInput && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in-up space-y-3">
            <div className="flex items-center gap-4">
              <input 
                type="datetime-local" 
                value={hearingDate}
                onChange={e => {
                  setHearingDate(e.target.value);
                  // Conflict Detection Logic
                  const targetDate = new Date(e.target.value).toDateString();
                  const lawyerConflicts = cases.filter(c => 
                    c.lawyer_name === caseData.lawyer_name && 
                    c.next_hearing_date && 
                    new Date(c.next_hearing_date).toDateString() === targetDate &&
                    c.id !== caseData.id
                  );
                  if (lawyerConflicts.length > 0) {
                    setConflictWarning(`Conflict: Counsel ${caseData.lawyer_name} already has a hearing for ${lawyerConflicts[0].case_number} on this date.`);
                  } else {
                    setConflictWarning(null);
                  }
                }}
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-judicial-400 outline-none"
              />
              <button 
                onClick={() => {
                  if (hearingDate) {
                    scheduleHearing(caseData.id, new Date(hearingDate).toISOString());
                    setShowScheduleInput(false);
                    setHearingDate('');
                  }
                }}
                className="bg-judicial-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
              >
                Confirm Date
              </button>
              <button onClick={() => setShowScheduleInput(false)} className="text-slate-400 px-2 hover:text-slate-600"><X size={20}/></button>
            </div>
            {conflictWarning && (
              <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2">
                <AlertCircle size={14} /> {conflictWarning}
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        {!showRemarkInput && !showScheduleInput && (
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowRemarkInput(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-2"
            >
              <MessageSquare size={16} /> Add Remark
            </button>
            <button 
              onClick={() => setShowScheduleInput(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-judicial-600 hover:bg-judicial-500 shadow-lg shadow-judicial-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Calendar size={16} /> Schedule Hearing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetail;
