import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Scale, AlertTriangle,
  Download, RefreshCw, BarChart2, Activity,
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import { format, subMonths } from 'date-fns';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const FUNNEL_COLORS = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  accentClass: string;
  invertChange?: boolean;  // true = down is good (avg duration, backlog)
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, accentClass, invertChange }) => {
  const isPositive = change !== undefined && (invertChange ? change < 0 : change > 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-xl ${accentClass}`}>{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AnalyticsDashboard: React.FC = () => {
  const [dateRange] = useState({
    start: subMonths(new Date(), 12),
    end: new Date(),
  });
  const [drilldownStage, setDrilldownStage] = useState<string | null>(null);

  const queryOpts = { refetchInterval: 60000 }; // Real-time: refresh every 60s

  const { data: kpiData, isLoading: kpiLoading, refetch: refetchAll } = useQuery({
    queryKey: ['analytics-kpi'], queryFn: analyticsAPI.getKPIs, ...queryOpts,
  });
  const { data: trendData } = useQuery({
    queryKey: ['analytics-trends', dateRange], queryFn: () => analyticsAPI.getTrends(dateRange), ...queryOpts,
  });
  const { data: judgePerformance } = useQuery({
    queryKey: ['analytics-judges'], queryFn: analyticsAPI.getJudgePerformance, ...queryOpts,
  });
  const { data: fairnessData } = useQuery({
    queryKey: ['analytics-fairness'], queryFn: analyticsAPI.getFairnessAudit, ...queryOpts,
  });
  const { data: bottleneckData } = useQuery({
    queryKey: ['analytics-bottleneck'], queryFn: analyticsAPI.getBottleneckAnalysis, ...queryOpts,
  });

  const handleExport = useCallback(async () => {
    const csv = await analyticsAPI.exportData(dateRange);
    downloadCSV(csv, `nyayagati-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  }, [dateRange]);

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-judicial-200 border-t-judicial-600" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-fade-in-up">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-serif">Court Performance Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Auto-refreshes every 60 s · Last updated {format(new Date(), 'hh:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetchAll()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 bg-judicial-700 text-white text-sm font-bold rounded-xl hover:bg-judicial-600 shadow-md shadow-judicial-700/20 transition-all hover:-translate-y-0.5">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Pending Cases"
          value={kpiData?.pending_cases?.toLocaleString() ?? '—'}
          change={kpiData?.pending_change}
          invertChange
          icon={<Scale size={22} className="text-blue-600" />}
          accentClass="bg-blue-50"
        />
        <KPICard
          title="Disposal Rate"
          value={`${kpiData?.disposal_rate?.toFixed(1) ?? '—'}%`}
          change={kpiData?.disposal_change}
          icon={<TrendingUp size={22} className="text-emerald-600" />}
          accentClass="bg-emerald-50"
        />
        <KPICard
          title="Avg. Duration"
          value={`${kpiData?.avg_duration_months?.toFixed(1) ?? '—'} mo`}
          change={kpiData?.duration_change}
          invertChange
          icon={<Activity size={22} className="text-amber-600" />}
          accentClass="bg-amber-50"
        />
        <KPICard
          title="Undertrial Backlog"
          value={kpiData?.undertrial_backlog?.toLocaleString() ?? '—'}
          change={kpiData?.undertrial_change}
          invertChange
          icon={<AlertTriangle size={22} className="text-red-500" />}
          accentClass="bg-red-50"
        />
      </div>

      {/* ── Trend Charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Filing vs Disposal — takes 2/3 width */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <BarChart2 size={20} className="text-judicial-500" /> Monthly Filing vs Disposal
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData?.monthly_stats ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
              <Line type="monotone" dataKey="filed"    stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Cases Filed" />
              <Line type="monotone" dataKey="disposed" stroke="#10b981" strokeWidth={2.5} dot={false} name="Cases Disposed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Case Type Pie — 1/3 width */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Case Type Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={kpiData?.case_type_distribution ?? []}
                cx="50%" cy="50%" outerRadius={95} innerRadius={50}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(kpiData?.case_type_distribution ?? []).map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottleneck Funnel + Fairness ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funnel / Horizontal bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Case Pipeline Bottleneck</h2>
          <p className="text-xs text-slate-400 mb-5">Click a stage to drill down</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bottleneckData?.stages ?? []} layout="vertical" onClick={e => setDrilldownStage(e?.activeLabel ?? null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis dataKey="stage" type="category" width={90} tick={{ fontSize: 12, fill: '#334155' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Cases">
                {(bottleneckData?.stages ?? []).map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {bottleneckData?.bottleneck_stage && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-amber-800">
                <strong>Bottleneck:</strong> <em>{bottleneckData.bottleneck_stage}</em> has the longest average wait time.
                {drilldownStage && <span className="block mt-1 text-xs">Selected: <strong>{drilldownStage}</strong> — drill-down view available when backend is connected.</span>}
              </span>
            </div>
          )}
        </div>

        {/* Fairness Audit */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Users size={20} className="text-indigo-500" /> Fairness Audit
          </h2>
          <p className="text-xs text-slate-400 mb-5">Average case duration by representation type</p>

          {fairnessData?.alerts && fairnessData.alerts.length > 0 && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5 mb-2">
                <AlertTriangle size={15} /> Disparate Impact Alerts
              </h3>
              <ul className="space-y-1.5">
                {fairnessData.alerts.map((a: any, i: number) => (
                  <li key={i} className="text-xs text-amber-800">• {a.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {fairnessData?.demographics.map((d: any) => {
              const pct = Math.min(100, (d.avg_duration_months / 25) * 100);
              const color = d.avg_duration_months < 13 ? 'bg-emerald-500' : d.avg_duration_months < 16 ? 'bg-amber-400' : 'bg-red-500';
              return (
                <div key={d.group}>
                  <div className="flex justify-between items-center mb-1.5 text-sm">
                    <span className="font-semibold text-slate-700">{d.group}</span>
                    <span className="font-black text-slate-900">{d.avg_duration_months} mo</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-2.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Frivolous Case Leaderboard ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-50 bg-rose-50/30">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" />
            Frivolous Petition Accountability Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">Lawyers with the highest rate of petition rejections by AI and Judges (Last 30 Days)</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { name: 'Sanjay Kapoor & Associates', submitted: 45, rejected: 18, rate: 40.0, trend: 'up' },
              { name: 'R.K. Legal Services', submitted: 32, rejected: 11, rate: 34.3, trend: 'up' },
              { name: 'Delhi Law Chambers', submitted: 88, rejected: 21, rate: 23.8, trend: 'down' },
              { name: 'Verma Counsel', submitted: 15, rejected: 3, rate: 20.0, trend: 'same' }
            ].map((lawyer, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 font-black rounded-full flex items-center justify-center text-sm shadow-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{lawyer.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{lawyer.rejected} rejected out of {lawyer.submitted} total</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-lg font-black text-rose-600">{lawyer.rate}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejection Rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Judge Performance Table ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Judge Performance Scoreboard</h2>
          <p className="text-xs text-slate-400 mt-1">Productivity score = composite of disposal rate, avg duration, and case complexity</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Judge Name', 'Assigned', 'Disposed (Month)', 'Disposal Rate', 'Productivity Score'].map(h => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {judgePerformance?.judges.map((j: any) => (
                <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{j.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{j.assigned_cases}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{j.disposed_this_month}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      j.disposal_rate > 70
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : j.disposal_rate > 50
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {j.disposal_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px] bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${j.productivity_score > 80 ? 'bg-emerald-500' : j.productivity_score > 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${j.productivity_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-700 w-8 text-right">{j.productivity_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsDashboard;
