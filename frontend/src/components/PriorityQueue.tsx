import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, Scale, ChevronRight } from 'lucide-react';

import { Case } from '../types';

interface PriorityQueueProps {
  cases: Case[];
  onSelectCase: (c: Case) => void;
}

const PriorityQueue: React.FC<PriorityQueueProps> = ({ cases, onSelectCase }) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Sort by urgency_score
  const sortedCases = [...cases].sort((a, b) => (b.urgency_score || 0) - (a.urgency_score || 0));

  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-soft border border-judicial-100 dark:border-slate-700 overflow-hidden backdrop-blur-sm bg-opacity-90 transition-all">
      <div className="p-5 border-b border-judicial-100 dark:border-slate-700 bg-gradient-to-r from-judicial-50 to-white dark:from-judicial-900 dark:to-slate-850 flex justify-between items-center">
        <h3 className="text-xl font-bold text-judicial-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={20} />
          High Priority Cases
        </h3>
        <span className="bg-judicial-100 dark:bg-judicial-800 text-judicial-800 dark:text-judicial-200 text-xs px-3 py-1 rounded-full font-semibold tracking-wide border border-judicial-200 dark:border-judicial-700">
          {cases.length} PENDING
        </span>
      </div>
      
      <div className="divide-y divide-judicial-50 dark:divide-slate-700/50 max-h-[700px] overflow-y-auto custom-scrollbar">
        {sortedCases.map((c) => (
          <div 
            key={c.id} 
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectCase(c)}
            className={`p-5 transition-all duration-300 cursor-pointer flex items-center justify-between group
              ${hoveredId === c.id ? 'bg-judicial-50/50 dark:bg-judicial-800/30 pl-7' : 'bg-transparent pl-5'}
            `}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-bold text-slate-400 tracking-wider font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{c.case_number}</span>
                {c.urgency_score > 150 && (
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Urgent
                  </span>
                )}
              </div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-judicial-600 dark:group-hover:text-judicial-300 transition-colors">
                {c.petitioner.name} <span className="text-slate-400 text-xs font-normal px-1">vs.</span> {c.respondent.name}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1"><Clock size={14} /> Filed: {c.filing_date}</span>
                <span className="flex items-center gap-1"><Scale size={14} /> Merit: {c.merit_score?.toFixed(1) || 'N/A'}</span>
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="text-right">
                <div className="text-2xl font-black text-judicial-900 dark:text-white group-hover:scale-110 transition-transform origin-right">
                  {c.urgency_score?.toFixed(0) || '0'}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Urgency Score</div>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-judicial-300 transition-transform duration-300 ${hoveredId === c.id ? 'translate-x-1 text-judicial-600 dark:text-judicial-400' : ''}`} 
              />
            </div>
          </div>
        ))}
        {cases.length === 0 && (
          <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
            <CheckCircle size={48} className="mb-3 text-emerald-400 opacity-50" />
            <p className="text-lg font-medium">Queue is empty</p>
            <p className="text-sm">All priority cases have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriorityQueue;
