import React, { useState, useEffect } from 'react';
import PriorityQueue from '../components/PriorityQueue';
import CaseDetail from '../components/CaseDetail';
import { Scale, Activity, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Search, Filter, RefreshCw, Cpu, CheckCircle } from 'lucide-react';
import { useMockDb } from '../context/MockDbContext';
import { Case, CaseStatus } from '../types';

const JudgeDashboard: React.FC = () => {
  const { cases, optimizeQueue, isOptimizing, lastOptimized, currentUser } = useMockDb();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [optimizerProgress, setOptimizerProgress] = useState(0);

  // Filter cases for Judge view — exact email match; fallback to all if none assigned
  const assignedCases = cases.filter(c =>
    c.judge_name === currentUser?.email
  );
  const casePool = assignedCases.length > 0 ? assignedCases : cases;

  const judgeCases = casePool.filter(c => {
    const sq = searchQuery.toLowerCase();
    const matchesSearch = 
      (c.case_number || '').toLowerCase().includes(sq) ||
      (c.petitioner?.name || '').toLowerCase().includes(sq) ||
      (c.respondent?.name || '').toLowerCase().includes(sq) ||
      (c.lawyer_name || '').toLowerCase().includes(sq);
    
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleOptimize = async () => {
    setOptimizerProgress(0);
    const interval = setInterval(() => {
      setOptimizerProgress(prev => Math.min(prev + 5, 99));
    }, 150);
    
    await optimizeQueue();
    clearInterval(interval);
    setOptimizerProgress(100);
  };

  // Auto-select top priority case on initial load or case list update
  useEffect(() => {
    if (judgeCases.length > 0) {
      if (!selectedCase) {
        setSelectedCase(judgeCases[0]);
      } else {
        const updatedCase = cases.find(c => c.id === selectedCase.id);
        if (updatedCase) setSelectedCase(updatedCase);
      }
    }
  }, [cases, judgeCases.length]);

  return (
    <div className="animate-fade-in-up py-6 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#102a43] mb-3 font-serif">
            Hon'ble Judge Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium max-w-2xl">
            Welcome back. AI has prioritized your docket for today based on urgency and merit.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="flex items-center justify-center gap-2 bg-judicial-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-judicial-600/20 hover:bg-judicial-700 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isOptimizing ? <RefreshCw size={20} className="animate-spin" /> : <Cpu size={20} />}
            {isOptimizing ? 'Optimizing Queue...' : (lastOptimized ? 'Re-optimize Docket' : 'Run AI Optimizer')}
          </button>
          
          <div className="bg-blue-600 text-white px-5 py-4 rounded-2xl shadow-lg shadow-blue-600/10 border border-blue-500 flex items-center gap-4 flex-1 md:flex-none">
            <div className="bg-white/20 p-3 rounded-xl">
              <Scale className="text-white" size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-0.5">Pending Review</p>
              <p className="text-2xl font-black text-white">{cases.filter(c => c.status === CaseStatus.PENDING_REVIEW).length}</p>
            </div>
          </div>
          <div className="bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-lg shadow-emerald-600/10 border border-emerald-500 flex items-center gap-4 flex-1 md:flex-none">
            <div className="bg-white/20 p-3 rounded-xl">
              <Activity className="text-white" size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-0.5">Accepted</p>
              <p className="text-2xl font-black text-white">{cases.filter(c => c.status !== CaseStatus.PENDING_REVIEW).length}</p>
            </div>
          </div>

        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID, Party, or Lawyer..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-judicial-400 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400 ml-2" />
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="py-2.5 pl-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-judicial-400 outline-none text-sm font-semibold text-slate-600"
          >
            <option value="all">All Statuses</option>
            <option value={CaseStatus.PENDING_REVIEW}>Pending Review</option>
            <option value={CaseStatus.ACCEPTED}>Accepted</option>
            <option value={CaseStatus.SCHEDULED}>Scheduled</option>
          </select>
        </div>
      </div>

      {isOptimizing && (
        <div className="mb-8 bg-slate-900 text-white rounded-3xl p-8 shadow-xl overflow-hidden relative animate-fade-in">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${optimizerProgress}%` }} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <Cpu size={32} className="text-blue-400 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold">AI Neuro-Symbolic Optimization in Progress</h3>
              <p className="text-slate-400 text-sm">Evaluating 25 factors per case to generate the optimal judicial schedule.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-400">Urgency Weight</span><span className="text-blue-400">40%</span></div>
              <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '85%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-400">Age of Case</span><span className="text-emerald-400">30%</span></div>
              <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-emerald-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-400">Vulnerability</span><span className="text-amber-400">20%</span></div>
              <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full animate-pulse" style={{ width: '90%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-400">Case Type</span><span className="text-purple-400">10%</span></div>
              <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-purple-400 h-2 rounded-full animate-pulse" style={{ width: '40%' }}></div></div>
            </div>
          </div>
        </div>
      )}

      {!isOptimizing && lastOptimized && (
        <div className="mb-6 flex items-center justify-end gap-2 text-sm font-semibold text-emerald-600 animate-fade-in">
          <CheckCircle size={16} />
          Queue Optimized at {lastOptimized}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 xl:col-span-4">
          <PriorityQueue cases={judgeCases} onSelectCase={setSelectedCase} />
        </div>
        <div className="lg:col-span-7 xl:col-span-8 sticky top-6">
          <CaseDetail caseData={selectedCase} />
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;
