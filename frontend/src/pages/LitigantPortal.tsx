import React, { useState } from 'react';
import { FileText, Search, Clock, CheckCircle, AlertTriangle, ChevronRight, Upload, Calendar, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Case, CaseStatus } from '../types';

import { useMockDb } from '../context/MockDbContext';

const STATUS_STEPS: CaseStatus[] = [
  CaseStatus.FILED,
  CaseStatus.EVIDENCE,
  CaseStatus.ARGUMENTS,
  CaseStatus.JUDGMENT,
  CaseStatus.DISPOSED,
];

const statusColor: Partial<Record<CaseStatus, string>> = {
  [CaseStatus.PENDING_REVIEW]: 'text-amber-600 bg-amber-50 border-amber-300',
  [CaseStatus.FILED]: 'text-blue-600 bg-blue-50 border-blue-200',
  [CaseStatus.ACCEPTED]: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  [CaseStatus.SCHEDULED]: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  [CaseStatus.EVIDENCE]: 'text-orange-600 bg-orange-50 border-orange-200',
  [CaseStatus.ARGUMENTS]: 'text-purple-600 bg-purple-50 border-purple-200',
  [CaseStatus.HEARING_IN_PROGRESS]: 'text-red-600 bg-red-50 border-red-200',
  [CaseStatus.JUDGMENT]: 'text-rose-600 bg-rose-50 border-rose-200',
  [CaseStatus.DISPOSED]: 'text-slate-600 bg-slate-100 border-slate-300',
};

interface PortalProps {
  isLawyer?: boolean;
}

const LitigantPortal: React.FC<PortalProps> = ({ isLawyer = false }) => {
  const navigate = useNavigate();
  const { cases, currentUser } = useMockDb();
  const [activeTab, setActiveTab] = useState<'cases' | 'file'>('cases');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cases based on role — exact email for lawyers, exact name for litigants
  const matchedCases = cases.filter(c => {
    if (isLawyer) {
      return c.lawyer_name === currentUser?.email;
    }
    // Litigant: match by petitioner or respondent name
    const name = currentUser?.name;
    return name && (c.petitioner?.name === name || c.respondent?.name === name);
  });

  const roleCases = matchedCases.length > 0 ? matchedCases : cases;

  const sq = searchQuery.toLowerCase();
  const filtered = roleCases.filter(
    c =>
      (c.case_number || '').toLowerCase().includes(sq) ||
      (c.respondent?.name || '').toLowerCase().includes(sq) ||
      (c.petitioner?.name || '').toLowerCase().includes(sq)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 font-serif mb-2 tracking-tight">
            {isLawyer ? 'Legal Counsel Portal' : 'Litigant Portal'}
          </h2>
          <p className="text-lg text-slate-500 font-medium">
            {isLawyer ? 'Manage your client portfolio, file new petitions, and track AI reviews.' : 'Track your cases, view AI-powered status updates, and upcoming hearings.'}
          </p>
        </div>
        {isLawyer ? (
          <Link 
            to="/lawyer/file"
            className="bg-judicial-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-judicial-600/20 hover:bg-judicial-700 transition-all flex items-center gap-2 group"
          >
            <PlusCircle size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            File New Petition
          </Link>
        ) : (
          <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm font-semibold border border-amber-200">
            Please contact your lawyer to file a petition.
          </div>
        )}
      </div>


      {activeTab === 'cases' && (
        <div>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by case number or respondent..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-judicial-400 outline-none text-sm transition-all shadow-sm"
            />
          </div>

          <div className="space-y-6">
            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">No Cases Found</h3>
                <p className="text-sm text-slate-400">
                  {isLawyer
                    ? `No cases are assigned to ${currentUser?.email}. File a new petition to get started.`
                    : `No cases found for ${currentUser?.name || 'your account'}.`}
                </p>
              </div>
            ) : (
              filtered.map(c => {
              const stepIdx = STATUS_STEPS.indexOf(c.status);
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <Link to={`/${isLawyer ? 'lawyer' : 'litigant'}/case/${encodeURIComponent(c.case_number)}`} className="p-6 border-b border-slate-50 block hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-bold text-slate-400">{c.case_number}</span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor[c.status] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {c.petitioner.name} <span className="text-slate-400 font-normal text-base">vs.</span> {c.respondent.name}
                        </h3>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 mt-1" />
                    </div>

                    <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} /> Filed: {c.filing_date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} /> Next Hearing: <strong className="text-slate-700">{c.next_hearing_date}</strong>
                      </span>
                    </div>
                  </Link>

                  {/* Progress Tracker */}
                  <div className="px-6 py-5 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Case Progress</p>
                    <div className="flex items-center gap-0">
                      {STATUS_STEPS.map((step, i) => (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              i < stepIdx
                                ? 'bg-emerald-500 text-white'
                                : i === stepIdx
                                ? 'bg-judicial-600 text-white ring-4 ring-judicial-200'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {i < stepIdx ? <CheckCircle size={14} /> : i + 1}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${i <= stepIdx ? 'text-slate-700' : 'text-slate-400'}`}>
                              {step}
                            </span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-4 ${i < stepIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* AI Insight Strip & Judge Assignment */}
                  <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm bg-slate-50/30">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <AlertTriangle size={14} className="text-amber-500" />
                        Merit Score: <strong className="text-slate-800">{c.merit_score?.toFixed(1) || 'N/A'}/100</strong>
                      </div>
                      <div className="w-px h-4 bg-slate-200" />
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={14} className="text-indigo-500" />
                        Urgency Score: <strong className="text-slate-800">{c.urgency_score?.toFixed(1) || 'N/A'}</strong>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-judicial-700 bg-judicial-50 border border-judicial-100 px-2.5 py-1 rounded-md">
                      Judge: {c.judge_name === 'justice.kumar@nyaya.in' ? "Justice A. Kumar" :
                              c.judge_name === 'justice.sharma@nyaya.in' ? "Justice R. Sharma" :
                              c.judge_name === 'justice.singh@nyaya.in' ? "Justice V. Singh" :
                              c.judge_name || "Presiding Judge"}
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LitigantPortal;
