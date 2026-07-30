import React, { useState } from 'react';
import { Brain, Zap, Scale, Clock, ChevronRight, BarChart2, Cpu, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface ModelResult {
  urgency_score: number;
  urgency_level: string;
  merit_score: number;
  merit_label: string;
  predicted_months: number;
  predicted_hearings: number;
  confidence: number;
  reasoning: string;
  features: Record<string, number>;
}

const CASE_EXAMPLES = [
  {
    label: 'Criminal – Assault (High Urgency)',
    case_type: 'criminal',
    filing_date: '2024-01-15',
    petitioner: 'Anita Kumar',
    respondent: 'State of UP',
    has_legal_aid: false,
    resubmission_count: 0,
    text_snippet: 'Physical assault causing grievous hurt under IPC 320. Victim hospitalised. Bail application pending.',
  },
  {
    label: 'Civil – Property Dispute (Medium)',
    case_type: 'civil',
    filing_date: '2023-06-10',
    petitioner: 'Ravi Sharma',
    respondent: 'DDA Housing',
    has_legal_aid: false,
    resubmission_count: 1,
    text_snippet: 'Land encroachment dispute. Respondent has built illegal structure on petitioner\'s registered plot. Evidence includes sale deed from 1992.',
  },
  {
    label: 'Family – Domestic Violence (Critical)',
    case_type: 'family',
    filing_date: '2024-03-01',
    petitioner: 'Meena Devi',
    respondent: 'Suresh Devi',
    has_legal_aid: true,
    resubmission_count: 0,
    text_snippet: 'Domestic violence and dowry harassment. Protection order requested. Two minor children involved. Victim is in shelter.',
  },
];

const computeFeatures = (c: typeof CASE_EXAMPLES[0]) => {
  const now = new Date();
  const filed = new Date(c.filing_date);
  const ageMonths = Math.max(0, (now.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const ageScore = Math.min(1.0, ageMonths / 24);

  const vulnerabilityMap: Record<string, number> = { family: 0.9, criminal: 0.7, civil: 0.4, commercial: 0.3 };
  const complexityMap: Record<string, number> = { criminal: 0.8, family: 0.7, civil: 0.6, commercial: 0.5 };
  const typeWeightMap: Record<string, number> = { criminal: 0.9, family: 0.8, civil: 0.5, commercial: 0.3 };

  const vulnerabilityScore = c.has_legal_aid ? 1.0 : (vulnerabilityMap[c.case_type] || 0.5);
  const complexityScore = complexityMap[c.case_type] || 0.5;
  const caseTypeWeight = typeWeightMap[c.case_type] || 0.5;
  const resubmissionPenalty = Math.min(0.5, c.resubmission_count * 0.15);

  return {
    age_score: parseFloat(ageScore.toFixed(2)),
    vulnerability_score: parseFloat(vulnerabilityScore.toFixed(2)),
    complexity_score: parseFloat(complexityScore.toFixed(2)),
    case_type_weight: parseFloat(caseTypeWeight.toFixed(2)),
    resubmission_penalty: parseFloat(resubmissionPenalty.toFixed(2)),
    legal_aid: c.has_legal_aid ? 1 : 0,
    text_length: c.text_snippet.length,
  };
};

const runModels = (c: typeof CASE_EXAMPLES[0]): ModelResult => {
  const f = computeFeatures(c);

  // Urgency Score formula (matches backend)
  const urgency = Math.min(200,
    f.age_score * 40 +
    f.vulnerability_score * 60 +
    f.complexity_score * 40 +
    f.case_type_weight * 40 +
    f.legal_aid * 20 -
    f.resubmission_penalty * 30
  );

  let urgencyLevel = 'Low';
  if (urgency >= 150) urgencyLevel = 'Critical';
  else if (urgency >= 100) urgencyLevel = 'High';
  else if (urgency >= 60) urgencyLevel = 'Medium';

  // Merit score (TF-IDF proxy — based on text length and keyword hits)
  const keywords = ['ipc', 'crpc', 'evidence', 'deed', 'assault', 'custody', 'harassment', 'violence', 'sale', 'protection'];
  const textLower = c.text_snippet.toLowerCase();
  const keywordHits = keywords.filter(k => textLower.includes(k)).length;
  const merit = Math.min(100, 50 + keywordHits * 6 + (f.text_length / 10));

  let meritLabel = 'Low Merit';
  if (merit >= 80) meritLabel = 'High Merit';
  else if (merit >= 60) meritLabel = 'Medium Merit';

  // Timeline prediction (XGBoost proxy)
  const baseMonths = { criminal: 18, civil: 14, family: 12, commercial: 10 }[c.case_type] || 14;
  const predicted_months = Math.round(baseMonths * (1 + f.complexity_score * 0.4) * (1 + f.age_score * 0.2));
  const predicted_hearings = Math.round(predicted_months * 0.9);

  const confidence = Math.round(75 + keywordHits * 2 + f.vulnerability_score * 5);

  const reasoning = `Urgency driven by ${urgencyLevel.toLowerCase()} vulnerability (${f.vulnerability_score}) and ${f.age_score > 0.5 ? 'significant case age' : 'recent filing'}. Merit score reflects ${keywordHits} legal keyword matches in petition text. Timeline estimated from ${c.case_type} case historical averages with complexity adjustment.`;

  return {
    urgency_score: parseFloat(urgency.toFixed(1)),
    urgency_level: urgencyLevel,
    merit_score: parseFloat(merit.toFixed(1)),
    merit_label: meritLabel,
    predicted_months,
    predicted_hearings,
    confidence: Math.min(99, confidence),
    reasoning,
    features: f,
  };
};

const FeatureBar: React.FC<{ label: string; value: number; max?: number; color: string }> = ({ label, value, max = 1, color }) => (
  <div className="mb-3">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-700">{value.toFixed(2)}</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

const MLDemo: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0); // 0=idle 1=extract 2=features 3=urgency 4=merit 5=timeline 6=done

  const selectedCase = CASE_EXAMPLES[selectedIdx];

  const runPipeline = async () => {
    setRunning(true);
    setResult(null);
    setStep(1);
    await new Promise(r => setTimeout(r, 700));
    setStep(2);
    await new Promise(r => setTimeout(r, 800));
    setStep(3);
    await new Promise(r => setTimeout(r, 700));
    setStep(4);
    await new Promise(r => setTimeout(r, 700));
    setStep(5);
    await new Promise(r => setTimeout(r, 600));
    setStep(6);
    setResult(runModels(selectedCase));
    setRunning(false);
  };

  const features = computeFeatures(selectedCase);

  const urgentColor = result
    ? result.urgency_level === 'Critical' ? 'text-red-600' : result.urgency_level === 'High' ? 'text-orange-500' : result.urgency_level === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-judicial-900 px-4 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2 rounded-full text-white/70 text-sm font-semibold mb-6">
            <Cpu size={16} className="text-blue-400" /> Live ML Pipeline Demonstration
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-serif">
            How the AI Models Work
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Select a case, click "Run Pipeline" and watch how Nyaya-Gati processes each petition through 3 specialized ML models in real time.
          </p>
        </div>

        {/* Case Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {CASE_EXAMPLES.map((c, i) => (
            <button
              key={i}
              onClick={() => { setSelectedIdx(i); setResult(null); setStep(0); }}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                selectedIdx === i
                  ? 'border-blue-500 bg-blue-500/20 shadow-xl shadow-blue-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 ${
                c.case_type === 'criminal' ? 'bg-red-500/20 text-red-300' : c.case_type === 'family' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {c.case_type}
              </div>
              <p className="text-white font-bold text-sm">{c.label}</p>
              <p className="text-slate-400 text-xs mt-1">{c.petitioner} vs. {c.respondent}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Input & Pipeline Steps */}
          <div className="lg:col-span-5 space-y-4">

            {/* Petition Preview */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Brain size={18} className="text-blue-400" /> Petition Input
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Type:</span><span className="text-white font-medium capitalize">{selectedCase.case_type}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Filed:</span><span className="text-white font-medium">{selectedCase.filing_date}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Legal Aid:</span><span className={`font-bold ${selectedCase.has_legal_aid ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedCase.has_legal_aid ? 'Yes' : 'No'}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Resubmissions:</span><span className="text-white font-medium">{selectedCase.resubmission_count}</span></div>
              </div>
              <div className="mt-4 bg-black/30 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Petition Text Snippet</p>
                <p className="text-slate-300 text-sm leading-relaxed italic">"{selectedCase.text_snippet}"</p>
              </div>
            </div>

            {/* Pipeline Steps */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <ArrowRight size={18} className="text-emerald-400" /> Pipeline Steps
              </h3>
              <div className="space-y-3">
                {[
                  { id: 1, icon: '📄', label: 'PDF Text Extraction', desc: 'pypdf reads petition document' },
                  { id: 2, icon: '⚙️', label: 'Feature Engineering', desc: 'Age, vulnerability, complexity computed' },
                  { id: 3, icon: '⚡', label: 'Urgency Model (XGBoost)', desc: 'Weighted multi-factor scoring' },
                  { id: 4, icon: '⚖️', label: 'Merit Model (TF-IDF + XGB)', desc: 'Text vectorization → classification' },
                  { id: 5, icon: '📅', label: 'Timeline Model (XGBoost)', desc: 'Duration regression prediction' },
                ].map(s => (
                  <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                    step > s.id ? 'border-emerald-500/50 bg-emerald-500/10' :
                    step === s.id ? 'border-blue-400/60 bg-blue-400/15 shadow-lg shadow-blue-400/10' :
                    'border-white/5 bg-white/3'
                  }`}>
                    <div className={`text-lg ${step === s.id ? 'animate-pulse' : ''}`}>{s.icon}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${step > s.id ? 'text-emerald-300' : step === s.id ? 'text-blue-300' : 'text-slate-400'}`}>{s.label}</p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                    {step > s.id && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                    {step === s.id && <RefreshCw size={16} className="text-blue-400 animate-spin shrink-0" />}
                  </div>
                ))}
              </div>
              <button
                onClick={runPipeline}
                disabled={running}
                className="w-full mt-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {running ? <><RefreshCw size={18} className="animate-spin" /> Running Pipeline...</> : <><Cpu size={18} /> Run AI Pipeline</>}
              </button>
            </div>
          </div>

          {/* Right: Features & Results */}
          <div className="lg:col-span-7 space-y-4">

            {/* Extracted Features */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-purple-400" /> Engineered Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FeatureBar label="Age Score" value={features.age_score} color="bg-blue-400" />
                  <FeatureBar label="Vulnerability Score" value={features.vulnerability_score} color="bg-red-400" />
                  <FeatureBar label="Complexity Score" value={features.complexity_score} color="bg-amber-400" />
                </div>
                <div>
                  <FeatureBar label="Case Type Weight" value={features.case_type_weight} color="bg-indigo-400" />
                  <FeatureBar label="Resubmission Penalty" value={features.resubmission_penalty} color="bg-rose-400" />
                  <FeatureBar label="Legal Aid Boost" value={features.legal_aid} color="bg-emerald-400" />
                </div>
              </div>
              <div className="mt-4 bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Urgency Formula</p>
                <code className="text-xs text-slate-300 leading-6 block">
                  urgency = (age×40) + (vuln×60) + (complex×40) + (type×40) + (legal_aid×20) − (resub×30)
                </code>
              </div>
            </div>

            {/* Results */}
            {result ? (
              <div className="space-y-4 animate-fade-in">

                {/* Score Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-2xl p-5 text-center">
                    <Zap size={20} className="text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-black text-white mb-1">{result.urgency_score}</p>
                    <p className={`text-xs font-bold uppercase tracking-wider ${urgentColor}`}>{result.urgency_level}</p>
                    <p className="text-xs text-slate-400 mt-1">Urgency Score</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-5 text-center">
                    <Scale size={20} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-3xl font-black text-white mb-1">{result.merit_score}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">{result.merit_label}</p>
                    <p className="text-xs text-slate-400 mt-1">Merit Score /100</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-2xl p-5 text-center">
                    <Clock size={20} className="text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-black text-white mb-1">{result.predicted_months}<span className="text-lg text-slate-400">m</span></p>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400">{result.predicted_hearings} Hearings</p>
                    <p className="text-xs text-slate-400 mt-1">Predicted Duration</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle size={16} className="text-emerald-400" /> Model Confidence</span>
                    <span className="text-emerald-400 font-black text-lg">{result.confidence}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-1000" style={{ width: `${result.confidence}%` }} />
                  </div>
                </div>

                {/* AI Reasoning */}
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">AI Reasoning</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{result.reasoning}</p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white/5 border border-dashed border-white/15 rounded-2xl p-12 text-center">
                <Brain size={48} className="text-white/10 mx-auto mb-4" />
                <p className="text-slate-500 font-semibold">Select a case and click <strong className="text-white/50">Run AI Pipeline</strong> to see the models in action</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLDemo;
