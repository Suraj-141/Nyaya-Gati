import React from 'react';
import { Case } from '../../types';
import { X } from 'lucide-react';

interface CaseDetailModalProps {
  case_: Case;
  onClose: () => void;
}

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ case_, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-850 z-10">
          <h2 className="text-2xl font-bold font-serif">{case_.case_number} Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Petitioner</p>
              <p className="text-lg font-medium">{case_.petitioner.name}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Respondent</p>
              <p className="text-lg font-medium">{case_.respondent.name}</p>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 mb-6 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">AI Insights</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500">Urgency Score</p>
                <p className="text-2xl font-black text-red-500">{case_.urgency_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Merit Score</p>
                <p className="text-2xl font-black text-emerald-500">{case_.merit_score?.toFixed(1) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Predicted Duration</p>
                <p className="text-xl font-bold">{case_.predicted_duration_months} months</p>
              </div>
            </div>
            {case_.urgency_explanation && (
              <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                <strong>Reasoning:</strong> {case_.urgency_explanation}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
              Close
            </button>
            <button className="px-5 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">
              Schedule Hearing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailModal;
