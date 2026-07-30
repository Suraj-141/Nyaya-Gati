import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, AlertCircle, Play, Save, Scale } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import axios from 'axios';

const Scheduling: React.FC = () => {
  const queryClient = useQueryClient();
  const [targetDate, setTargetDate] = useState(format(addDays(startOfToday(), 1), 'yyyy-MM-dd'));
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Fetch current schedule
  const { data: dailySchedule, isLoading } = useQuery({
    queryKey: ['dailySchedule', targetDate],
    queryFn: async () => {
      // Mocking the call since backend might not be live
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        date: targetDate,
        schedules: [
          { id: 1, case_number: 'DEL/2024/0912', judge_id: 1, courtroom: 'Room A', start_time: `${targetDate}T10:00:00`, end_time: `${targetDate}T10:45:00`, status: 'scheduled' },
          { id: 2, case_number: 'DEL/2024/1104', judge_id: 1, courtroom: 'Room B', start_time: `${targetDate}T11:00:00`, end_time: `${targetDate}T11:45:00`, status: 'scheduled' },
        ],
        utilization_percentage: 45.5
      };
    }
  });

  // Run optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      setIsOptimizing(true);
      // Simulate OR-Tools optimization
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailySchedule'] });
      setIsOptimizing(false);
    }
  });

  return (
    <div className="max-w-[1400px] mx-auto py-10 px-6 animate-fade-in-up">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 font-serif mb-2 tracking-tight">Court Schedule Optimizer</h2>
          <p className="text-lg text-slate-500 font-medium">Use AI to generate conflict-free schedules for judges and courtrooms.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <CalendarIcon size={18} className="text-judicial-600" />
            <input 
              type="date" 
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent border-0 font-bold text-slate-700 focus:ring-0 text-sm"
            />
          </div>
          <button 
            onClick={() => optimizeMutation.mutate()}
            disabled={isOptimizing}
            className="bg-judicial-600 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-judicial-600/20 hover:bg-judicial-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isOptimizing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            {isOptimizing ? 'Optimizing...' : 'Run AI Optimizer'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Statistics Bar */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Utilization</p>
              <h4 className="text-2xl font-black text-slate-800">{dailySchedule?.utilization_percentage}%</h4>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Hearings</p>
              <h4 className="text-2xl font-black text-slate-800">{dailySchedule?.schedules.length || 0}</h4>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Conflicts Detected</p>
              <h4 className="text-2xl font-black text-slate-800">0</h4>
            </div>
          </div>
        </div>

        {/* Schedule Timeline */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Timeline for {format(new Date(targetDate), 'MMMM dd, yyyy')}</h3>
            <button className="text-judicial-600 font-bold text-sm hover:underline flex items-center gap-1">
              <Save size={16} /> Save Changes
            </button>
          </div>
          
          <div className="p-8 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-judicial-500 rounded-full animate-spin mb-4"></div>
                <p className="font-bold">Loading schedule...</p>
              </div>
            ) : dailySchedule?.schedules.map((s: any, idx: number) => (
              <div key={s.id} className="relative pl-8 pb-8 last:pb-0 border-l-2 border-slate-100">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-judicial-600 ring-4 ring-white shadow-sm" />
                <div className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors border border-slate-100 group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-black text-white bg-judicial-800 px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">
                        Slot {idx + 1}
                      </span>
                      <h4 className="text-lg font-black text-slate-900">{s.case_number}</h4>
                      <p className="text-sm font-medium text-slate-500">Criminal Appeal - Merit Score: 85.0</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                        <Clock size={14} className="text-judicial-500" />
                        {format(new Date(s.start_time), 'HH:mm')} - {format(new Date(s.end_time), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                        <MapPin size={14} className="text-rose-500" />
                        {s.courtroom}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs font-bold px-3 py-1.5 text-slate-500 hover:text-slate-800">Reschedule</button>
                    <button className="text-xs font-bold px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-judicial-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Scale size={160} />
            </div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-400" /> AI Recommendations
            </h3>
            <ul className="space-y-4 relative z-10">
              <li className="bg-white/10 p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm border border-white/10">
                <strong>High Efficiency Detected:</strong> Combining Case 0912 and 1104 in Courtroom A could save 15% transit time for Judge Kumar.
              </li>
              <li className="bg-white/10 p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm border border-white/10">
                <strong>Backlog Alert:</strong> 12 Commercial cases are pending for 60+ days. Consider a special Saturday session.
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-3 bg-slate-50 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all text-left px-4 border border-slate-100">
                Email Schedule to All Parties
              </button>
              <button className="w-full py-3 bg-slate-50 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all text-left px-4 border border-slate-100">
                Download PDF Calendar
              </button>
              <button className="w-full py-3 bg-slate-50 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all text-left px-4 border border-slate-100">
                Sync with Mobile App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduling;
