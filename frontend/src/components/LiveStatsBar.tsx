import React from 'react';
import { Activity, Clock, FileCheck, RefreshCw } from 'lucide-react';
import { useMockDb } from '../context/MockDbContext';

const LiveStatsBar: React.FC = () => {
  const { stats } = useMockDb();

  return (
    <div className="bg-judicial-900 text-white border-b border-judicial-800">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-judicial-300 font-semibold tracking-wider uppercase text-[10px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Court Statistics
        </div>
        
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Activity size={14} className="text-judicial-400" />
            <span className="text-slate-300">Total Cases:</span>
            <span className="font-bold">{stats.totalCases.toLocaleString()}</span>
          </div>
          
          <div className="w-px h-4 bg-judicial-800" />
          
          <div className="flex items-center gap-2 whitespace-nowrap">
            <FileCheck size={14} className="text-emerald-400" />
            <span className="text-slate-300">Disposed This Month:</span>
            <span className="font-bold text-emerald-400">{stats.disposedThisMonth}</span>
          </div>
          
          <div className="w-px h-4 bg-judicial-800" />
          
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Clock size={14} className="text-amber-400" />
            <span className="text-slate-300">Avg Resolution:</span>
            <span className="font-bold text-amber-400">{stats.avgResolutionTime} mo</span>
          </div>

          <div className="w-px h-4 bg-judicial-800" />
          
          <div className="flex items-center gap-2 whitespace-nowrap">
            <RefreshCw size={14} className="text-red-400" />
            <span className="text-slate-300">Backlog Alert:</span>
            <span className="font-bold text-red-400">{stats.backlogCount.toLocaleString()} pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStatsBar;
