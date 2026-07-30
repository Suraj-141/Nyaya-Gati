import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  FileText, Download, Calendar, Bell,
  Clock, CheckCircle, Circle, ArrowRight,
  MessageSquare, Mail, Smartphone, HelpCircle
} from 'lucide-react';
import { caseAPI } from '../../services/api';
import { Case, CaseStatus } from '../../types';
import { format } from 'date-fns';
import { useMockDb } from '../../context/MockDbContext';

// ─── Config ────────────────────────────────────────────────────────────────────
const STATUS_STEPS: CaseStatus[] = [
  CaseStatus.FILED,
  CaseStatus.EVIDENCE,
  CaseStatus.ARGUMENTS,
  CaseStatus.JUDGMENT,
  CaseStatus.DISPOSED,
];

const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.FILED]:     'Case Filed',
  [CaseStatus.EVIDENCE]:  'Evidence Submission',
  [CaseStatus.ARGUMENTS]: 'Arguments Phase',
  [CaseStatus.JUDGMENT]:  'Judgment Writing',
  [CaseStatus.DISPOSED]:  'Case Closed',
};

const STATUS_DESCRIPTIONS: Record<CaseStatus, string> = {
  [CaseStatus.FILED]:     'Your petition has been received by the court and assigned a case number.',
  [CaseStatus.EVIDENCE]:  'Both parties are submitting documents and witness lists to support their claims.',
  [CaseStatus.ARGUMENTS]: 'Lawyers from both sides are presenting their legal arguments before the judge.',
  [CaseStatus.JUDGMENT]:  'The judge is reviewing all evidence and arguments to write the final order.',
  [CaseStatus.DISPOSED]:  'The court has delivered its final judgment. This case is now closed.',
};

const STATUS_PROGRESS: Record<CaseStatus, number> = {
  [CaseStatus.FILED]:     20,
  [CaseStatus.EVIDENCE]:  40,
  [CaseStatus.ARGUMENTS]: 70,
  [CaseStatus.JUDGMENT]:  90,
  [CaseStatus.DISPOSED]:  100,
};

// ─── Component ─────────────────────────────────────────────────────────────────
const CaseTracking: React.FC = () => {
  const { caseNumber: rawCaseParam } = useParams<{ caseNumber?: string }>();
  const { cases } = useMockDb();
  const [notifPrefs, setNotifPrefs] = useState({ sms: true, whatsapp: true, email: false });

  // Extract full case number from URL path if rawCaseParam missed slashes
  const windowPath = window.location.pathname;
  const pathPart = windowPath.split('/case/')[1] || '';
  const caseNumber = rawCaseParam || decodeURIComponent(pathPart);

  const decodedCaseNumber = caseNumber ? decodeURIComponent(caseNumber).trim() : '';

  const localCase = cases.find(c => 
    c.case_number?.trim() === decodedCaseNumber || 
    c.case_number?.replace(/\//g, '-') === decodedCaseNumber ||
    String(c.id) === decodedCaseNumber
  );

  const { data: apiCase, isLoading } = useQuery({
    queryKey: ['case', decodedCaseNumber],
    queryFn: () => caseAPI.getCaseByNumber(decodedCaseNumber),
    enabled: !!decodedCaseNumber && !localCase,
  });

  const caseData = localCase || apiCase;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && !localCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-judicial-200 border-t-judicial-600" />
        <p className="text-slate-500 font-medium">Loading your case details…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (!caseData) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-900 mb-2">Case Not Found</h2>
        <p className="text-red-700 text-sm">
          We couldn't find case <strong>{caseNumber}</strong>. Please check the number and try again.
        </p>
      </div>
    );
  }

  const c = caseData;
  const progress = STATUS_PROGRESS[c.status] ?? 0;
  const stepIdx  = STATUS_STEPS.indexOf(c.status);
  const nextStatus = stepIdx >= 0 && stepIdx < STATUS_STEPS.length - 1
    ? STATUS_STEPS[stepIdx + 1]
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 animate-fade-in-up">

      {/* ── 1. Hero Card ─────────────────────────────────────────────────── */}
      <div className="bg-judicial-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-8 -right-8 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <p className="text-judicial-200 text-xs font-bold uppercase tracking-widest mb-1">Case Number</p>
        <h1 className="text-2xl md:text-3xl font-black mb-3 font-mono">{c.case_number}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-judicial-200">
          <span>{c.petitioner.name} <span className="text-judicial-400">vs.</span> {c.respondent.name}</span>
          <span>Filed: {format(new Date(c.filing_date), 'dd MMM yyyy')}</span>
        </div>
        <div className="mt-4 pt-3 border-t border-judicial-700/60 flex items-center justify-between text-xs">
          <span className="text-judicial-300 font-medium">Assigned Judge:</span>
          <span className="font-bold text-amber-300 bg-judicial-900/60 px-3 py-1 rounded-lg border border-judicial-700">
            {c.judge_name === 'justice.kumar@nyaya.in' ? "Hon'ble Justice A. Kumar" :
             c.judge_name === 'justice.sharma@nyaya.in' ? "Hon'ble Justice R. Sharma" :
             c.judge_name === 'justice.singh@nyaya.in' ? "Hon'ble Justice V. Singh" :
             c.judge_name || "Hon'ble Presiding Judge"}
          </span>
        </div>
      </div>

      {/* ── 2. Progress Bar ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Case Progress</h2>
          <span className="text-2xl font-black text-judicial-600">{progress}%</span>
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-judicial-500 to-judicial-700 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-start gap-0">
          {STATUS_STEPS.map((step, i) => {
            const done    = i < stepIdx;
            const current = i === stepIdx;
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done    ? 'bg-emerald-500 text-white'
                    : current ? 'bg-judicial-600 text-white ring-4 ring-judicial-100'
                    : 'bg-slate-200 text-slate-400'
                  }`}>
                    {done ? <CheckCircle size={16} /> : <Circle size={16} />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wide text-center max-w-[56px] leading-tight ${
                    current ? 'text-judicial-700' : done ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {STATUS_LABELS[step].split(' ')[0]}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-4 ${i < stepIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── 3. Current Status ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">What's Happening Now?</h2>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-judicial-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle size={24} className="text-judicial-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 mb-1">{STATUS_LABELS[c.status]}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{STATUS_DESCRIPTIONS[c.status]}</p>
            {nextStatus && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                <ArrowRight size={13} />
                Next step: {STATUS_LABELS[nextStatus]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Next Hearing ──────────────────────────────────────────────── */}
      {c.next_hearing_date && (
        <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} />
            <h2 className="text-lg font-bold">Your Next Court Date</h2>
          </div>
          <p className="text-3xl font-black mb-1">
            {format(new Date(c.next_hearing_date), 'dd MMMM yyyy')}
          </p>
          <p className="text-emerald-100 text-sm mb-1">
            ⏰ {format(new Date(c.next_hearing_date), 'hh:mm a')}
          </p>
          <p className="text-emerald-100 text-sm mb-4">
            📍 {c.courtroom || 'Courtroom TBA — contact court clerk'}
          </p>
          <button className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-50 active:scale-95 transition-all touch-manipulation">
            <Bell size={16} /> Set a Reminder
          </button>
        </div>
      )}

      {/* ── 5. AI Timeline Prediction ────────────────────────────────────── */}
      {(c.predicted_duration_months || c.predicted_hearings) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={20} className="text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800">Expected Timeline</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Estimated Hearings</p>
              <p className="text-4xl font-black text-indigo-900">{c.predicted_hearings ?? '—'}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Total Duration</p>
              <p className="text-4xl font-black text-indigo-900">
                {c.predicted_duration_months ? `${c.predicted_duration_months}` : '—'}
                <span className="text-xl text-indigo-400 ml-1">mo</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ℹ️ These are AI-generated estimates based on 5,000+ similar cases. Actual duration may vary depending on court schedule and evidence submissions.
          </p>
        </div>
      )}

      {/* ── 6. Documents ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-judicial-500" /> Case Documents
        </h2>
        <div className="space-y-3">
          {/* Petition */}
          <a
            href={c.petition_pdf_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-judicial-50 hover:border-judicial-200 active:scale-[0.98] transition-all touch-manipulation group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-judicial-100 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-judicial-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Original Petition</p>
                <p className="text-xs text-slate-500">Filed {format(new Date(c.filing_date), 'dd MMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-judicial-600 font-bold text-sm">
              <Download size={16} /> Download
            </div>
          </a>

          {/* Court Orders */}
          {c.orders && c.orders.length > 0 && c.orders.map((order, idx) => (
            <a
              key={idx}
              href={order.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-judicial-50 hover:border-judicial-200 active:scale-[0.98] transition-all touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileText size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{order.title || `Court Order #${idx + 1}`}</p>
                  <p className="text-xs text-slate-500">Issued {format(new Date(order.date), 'dd MMM yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
                <Download size={16} /> Download
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── 7. Notifications ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Bell size={20} className="text-judicial-500" /> Stay Updated
        </h2>
        <div className="space-y-4">
          {([
            { key: 'sms',       icon: Smartphone,     label: 'SMS Notifications',              sub: 'Receive a text message on every hearing date' },
            { key: 'whatsapp',  icon: MessageSquare,   label: 'WhatsApp Updates',               sub: 'Status changes and document uploads' },
            { key: 'email',     icon: Mail,            label: 'Monthly Email Summary',          sub: 'Full case activity report each month' },
          ] as const).map(({ key, icon: Icon, label, sub }) => (
            <label key={key} className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors touch-manipulation">
              <div className="flex-shrink-0 w-10 h-10 bg-judicial-50 rounded-lg flex items-center justify-center mt-0.5">
                <Icon size={18} className="text-judicial-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
              </div>
              <div className="flex-shrink-0 mt-1">
                <div
                  onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${notifPrefs[key] ? 'bg-judicial-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${notifPrefs[key] ? 'left-6' : 'left-1'}`} />
                </div>
              </div>
            </label>
          ))}
        </div>
        <button className="mt-5 w-full py-3.5 bg-judicial-700 text-white font-bold rounded-xl hover:bg-judicial-600 active:scale-[0.98] transition-all touch-manipulation shadow-md shadow-judicial-700/20">
          Save Preferences
        </button>
      </div>

      {/* ── 8. Help Banner ───────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
        <HelpCircle size={28} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-900 mb-1">Need Help?</h3>
          <p className="text-amber-700 text-sm leading-relaxed mb-4">
            If you have questions about your case, contact your lawyer or visit the court's public help desk. Our staff speak Hindi, English, and regional languages.
          </p>
          <button className="px-5 py-3 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 active:scale-[0.98] transition-all touch-manipulation">
            Contact Help Desk
          </button>
        </div>
      </div>

    </div>
  );
};

export default CaseTracking;
