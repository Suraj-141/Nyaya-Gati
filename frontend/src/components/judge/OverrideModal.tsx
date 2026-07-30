import React, { useState } from 'react';
import { Case } from '../../types';
import { X, AlertTriangle } from 'lucide-react';

interface OverrideModalProps {
  case_: Case;
  onSubmit: (newScore: number, reason: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const OverrideModal: React.FC<OverrideModalProps> = ({ case_, onSubmit, onClose, isLoading }) => {
  const [newScore, setNewScore] = useState<number>(case_.urgency_score);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return alert("Reason is required for audit logs.");
    onSubmit(newScore, reason);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-amber-500 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle size={20} />
              Override Priority
            </h2>
            <p className="text-amber-100 text-sm mt-1">Manual override for {case_.case_number}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              New Urgency Score (0-200)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              step="0.1"
              value={newScore}
              onChange={(e) => setNewScore(parseFloat(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-lg"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Reason for Override <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all min-h-[100px] resize-none"
              placeholder="Provide a required reason for the audit log..."
              required
            ></textarea>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Confirm Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OverrideModal;
