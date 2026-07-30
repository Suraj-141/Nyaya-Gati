import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Scale, CheckCircle2, AlertCircle, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';
import { useMockDb } from '../../context/MockDbContext';
import { evaluateCaseML, MLPredictionResult } from '../../services/mlEngine';
import { CaseType } from '../../types';

const FileCase: React.FC = () => {
  const navigate = useNavigate();
  const { submitPetition, cases } = useMockDb();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mlResult, setMlResult] = useState<MLPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('Initializing ML model sequence...');
  
  const [formData, setFormData] = useState({
    case_number: `NYG/2026/${Math.floor(10000 + Math.random() * 90000)}`,
    case_type: 'civil' as CaseType,
    petitioner_name: '',
    petitioner_legal_aid: false,
    is_senior_citizen: false,
    respondent_name: '',
    petition_text: '',
  });

  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setAiProgress(5);
    setCurrentStepText('Reading petition document & text...');

    try {
      // Step 1: Document OCR & Text Processing (Progress 25%)
      await new Promise(r => setTimeout(r, 600));
      setAiProgress(30);
      setCurrentStepText('Running Legal-NER & Statute Extraction...');

      // Step 2: ML Evaluation (Progress 65%)
      await new Promise(r => setTimeout(r, 800));
      setAiProgress(65);
      setCurrentStepText('Inferring Urgency (XGBoost) & Merit (TF-IDF Classifier)...');

      const evalResult = await evaluateCaseML({
        case_type: formData.case_type,
        petitioner_name: formData.petitioner_name,
        petitioner_legal_aid: formData.petitioner_legal_aid,
        is_senior_citizen: formData.is_senior_citizen,
        respondent_name: formData.respondent_name,
        petition_text: formData.petition_text,
        file: file
      });

      // Step 3: Timeline & Confidence Calculation (Progress 90%)
      await new Promise(r => setTimeout(r, 600));
      setAiProgress(90);
      setCurrentStepText('Predicting trial duration & hearings...');

      await new Promise(r => setTimeout(r, 400));
      setAiProgress(100);

      // Submit to global context with real ML evaluations
      await submitPetition({
        case_number: formData.case_number,
        case_type: formData.case_type,
        petitioner: { 
          name: formData.petitioner_name, 
          legal_aid: formData.petitioner_legal_aid 
        },
        respondent: { name: formData.respondent_name },
        urgency_score: evalResult.urgency_score,
        urgency_level: evalResult.urgency_level,
        merit_score: evalResult.merit_score,
        predicted_duration_months: evalResult.predicted_duration_months,
        predicted_hearings: evalResult.predicted_hearings,
        ai_reasoning: evalResult.ai_reasoning,
        urgency_explanation: evalResult.ai_reasoning,
        petition_text: formData.petition_text
      });

      setMlResult(evalResult);
      setSuccess(true);

    } catch (err: any) {
      setError(err.message || 'Failed to analyze & file case petition');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success && mlResult) {
    const isHighMerit = mlResult.merit_score >= 60;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-xl w-full border border-slate-100 animate-fade-in-up">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isHighMerit ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {isHighMerit ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
            </div>
            <h2 className="text-3xl font-black text-slate-900 font-serif">
              {isHighMerit ? 'Petition Analyzed & Accepted' : 'Petition Flagged for Judicial Review'}
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-mono">Case Number: {formData.case_number}</p>
          </div>

          {/* Real ML Output Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Merit Score</span>
              <span className="text-2xl font-black text-slate-800">{mlResult.merit_score}/100</span>
              <span className={`text-[10px] font-bold block mt-0.5 ${
                mlResult.merit_tier === 'HIGH_MERIT' ? 'text-emerald-600' : mlResult.merit_tier === 'MEDIUM_MERIT' ? 'text-blue-600' : 'text-rose-600'
              }`}>
                {mlResult.merit_tier.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Urgency</span>
              <span className="text-2xl font-black text-slate-800">{mlResult.urgency_score}</span>
              <span className="text-[10px] font-bold text-amber-600 block mt-0.5">{mlResult.urgency_level} Priority</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Est. Duration</span>
              <span className="text-2xl font-black text-slate-800">{mlResult.predicted_duration_months}m</span>
              <span className="text-[10px] font-bold text-slate-500 block mt-0.5">{mlResult.predicted_hearings} Hearings</span>
            </div>
          </div>

          {/* Assigned Judge Card */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Assigned Judicial Bench (Lowest Backlog)</span>
                <span className="text-sm font-black text-emerald-950">
                  {(() => {
                    const assigned = cases.find(c => c.case_number === formData.case_number)?.judge_name;
                    if (assigned === 'justice.kumar@nyaya.in') return "Hon'ble Justice A. Kumar";
                    if (assigned === 'justice.sharma@nyaya.in') return "Hon'ble Justice R. Sharma";
                    if (assigned === 'justice.singh@nyaya.in') return "Hon'ble Justice V. Singh";
                    return assigned || "Hon'ble Presiding Judge";
                  })()}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
              Auto-Routed
            </span>
          </div>

          {/* AI Confidence & Reasoning */}
          <div className="bg-blue-50/80 border border-blue-200 p-5 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-blue-600" /> Real ML Model Inference
              </span>
              <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                {mlResult.confidence_score}% Confidence
              </span>
            </div>
            <p className="text-xs text-blue-950 leading-relaxed font-medium">
              {mlResult.ai_reasoning}
            </p>
            {mlResult.extracted_statutes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-blue-800">Extracted Statutes:</span>
                {mlResult.extracted_statutes.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-blue-800 px-2 py-0.5 rounded-md font-mono border border-blue-200 font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/lawyer')}
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            Return to Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center">
          <Cpu size={48} className="text-judicial-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Executing ML Model Inference...</h2>
          <p className="text-slate-500 mb-6 text-sm">{currentStepText}</p>
          
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
            <div 
              className="h-3 rounded-full bg-gradient-to-r from-judicial-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${aiProgress}%` }}
            ></div>
          </div>
          <p className="text-xs font-bold text-slate-400">{aiProgress}% Complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 font-serif tracking-tight">
          File New e-Petition
        </h1>
        <p className="text-slate-500 text-base md:text-lg font-medium">
          Digital-first filing analyzed in real-time by Nyaya-Gati Machine Learning Models (XGBoost, Legal-BERT, TF-IDF).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Petitioner Details */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
              <h3 className="text-xl font-bold text-slate-800">Petitioner Details</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-judicial-500 transition-all font-medium text-slate-800"
                  placeholder="Enter petitioner's full name"
                  value={formData.petitioner_name}
                  onChange={e => setFormData({...formData, petitioner_name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Case Classification</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-judicial-500 font-medium text-slate-800"
                  value={formData.case_type}
                  onChange={e => setFormData({...formData, case_type: e.target.value as CaseType})}
                >
                  <option value="civil">Civil Suit</option>
                  <option value="criminal">Criminal Petition</option>
                  <option value="family">Family / Domestic Dispute</option>
                  <option value="commercial">Commercial Dispute</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <input 
                    type="checkbox" 
                    id="legalaid"
                    className="w-5 h-5 text-judicial-600 rounded focus:ring-judicial-500"
                    checked={formData.petitioner_legal_aid}
                    onChange={e => setFormData({...formData, petitioner_legal_aid: e.target.checked})}
                  />
                  <label htmlFor="legalaid" className="text-sm font-bold text-slate-700 cursor-pointer">Requesting Legal Aid (Pro Bono)</label>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <input 
                    type="checkbox" 
                    id="seniorcitizen"
                    className="w-5 h-5 text-judicial-600 rounded focus:ring-judicial-500"
                    checked={formData.is_senior_citizen}
                    onChange={e => setFormData({...formData, is_senior_citizen: e.target.checked})}
                  />
                  <label htmlFor="seniorcitizen" className="text-sm font-bold text-slate-700 cursor-pointer">Petitioner is a Senior Citizen (60+ yrs)</label>
                </div>
              </div>
            </div>
          </section>

          {/* Respondent Details */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><FileText size={20} /></div>
              <h3 className="text-xl font-bold text-slate-800">Respondent Details</h3>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Opposing Party Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-judicial-500 transition-all font-medium text-slate-800"
                placeholder="Name of individual or organization"
                value={formData.respondent_name}
                onChange={e => setFormData({...formData, respondent_name: e.target.value})}
              />
            </div>
          </section>
        </div>

        {/* Petition Text & PDF Upload */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Scale size={20} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Petition Facts & Ground Summary</h3>
              <p className="text-xs text-slate-500">Provide details or upload PDF petition. ML model uses text keywords & evidence count for scoring.</p>
            </div>
          </div>
          
          <textarea 
            required
            rows={5}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-judicial-500 transition-all font-medium resize-none mb-6 text-slate-800"
            placeholder="Describe the main facts of the case, statutory sections (e.g. IPC 302, CrPC 439, CPC Order 39), and relief claimed..."
            value={formData.petition_text}
            onChange={e => setFormData({...formData, petition_text: e.target.value})}
          />
          
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-judicial-300 transition-colors group cursor-pointer">
            <input type="file" className="hidden" id="pdf-upload" accept=".pdf,.txt,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-judicial-50 group-hover:text-judicial-600 transition-all">
                <Upload size={28} />
              </div>
              <p className="text-base font-bold text-slate-700 mb-1">{file ? file.name : 'Upload PDF / Text Petition File'}</p>
              <p className="text-xs text-slate-400 font-medium">Text will be parsed by backend OCR/ML Service</p>
            </label>
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
            <AlertCircle size={20} />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/lawyer')}
            className="px-8 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-judicial-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-judicial-600/30 hover:bg-judicial-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            Run ML Triage & File Petition
          </button>
        </div>
      </form>
    </div>
  );
};

export default FileCase;
