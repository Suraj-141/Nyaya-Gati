import React, { useState, useEffect } from 'react';
import { Cpu, Activity, AlertTriangle, CheckCircle, Server, BarChart3, TrendingUp, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Dummy fetch function for model stats
const fetchModelStats = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    models: [
      { id: 'frivolous_xgb_v2', name: 'Merit / Frivolous Detector', type: 'XGBoost Classifier', status: 'active', accuracy: 0.92, requests_today: 1450, latency_ms: 45 },
      { id: 'timeline_xgb_v1', name: 'Timeline Predictor', type: 'XGBoost Regressor', status: 'active', accuracy: 0.88, requests_today: 1450, latency_ms: 60 },
      { id: 'urgency_xgb_v3', name: 'Urgency Scorer', type: 'XGBoost Regressor', status: 'active', accuracy: 0.94, requests_today: 1450, latency_ms: 35 },
      { id: 'ner_spacy_trf', name: 'Legal NER Extraction', type: 'spaCy Transformer', status: 'active', accuracy: 0.95, requests_today: 1450, latency_ms: 120 },
    ],
    system_health: {
      cpu_usage: 45,
      memory_usage: 68,
      gpu_usage: 12
    },
    drift_alerts: [
      { id: 1, model: 'Timeline Predictor', feature: 'court_backlog', drift_score: 0.15, severity: 'low', message: 'Slight distribution shift in court backlog data from latest filings.' }
    ]
  };
};

const ModelMonitor: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['modelStats'], queryFn: fetchModelStats, refetchInterval: 10000 });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up py-6 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tight text-slate-800 mb-3 font-serif flex items-center gap-3">
          <Cpu className="text-indigo-600" size={36} /> AI Model Monitor
        </h2>
        <p className="text-slate-500 text-lg max-w-2xl">
          Real-time telemetry, accuracy tracking, and data drift monitoring for active ML models.
        </p>
      </header>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">CPU Load</p>
            <p className="text-3xl font-black text-slate-800">{data.system_health.cpu_usage}%</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl">
            <Server className="text-indigo-600" size={28} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Memory</p>
            <p className="text-3xl font-black text-slate-800">{data.system_health.memory_usage}%</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl">
            <Activity className="text-emerald-600" size={28} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">GPU Util</p>
            <p className="text-3xl font-black text-slate-800">{data.system_health.gpu_usage}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <BarChart3 className="text-purple-600" size={28} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Active Models Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" /> Active Models
            </h3>
            <button className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View History</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                  <th className="p-4 pl-6">Model Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Accuracy / R²</th>
                  <th className="p-4 text-right pr-6">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.models.map((model) => (
                  <tr key={model.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800">{model.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{model.id}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{model.type}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${model.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {model.status === 'active' ? <CheckCircle size={12} /> : null}
                        {model.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-bold text-slate-800">{(model.accuracy * 100).toFixed(1)}%</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${model.accuracy * 100}%` }}></div>
                      </div>
                    </td>
                    <td className="p-4 text-right pr-6 font-mono text-sm text-slate-600">
                      {model.latency_ms}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drift Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" /> Data Drift Alerts
            </h3>
          </div>
          <div className="p-6 flex-1 bg-slate-50/50">
            {data.drift_alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <CheckCircle size={40} className="text-emerald-400 opacity-50" />
                <p className="font-semibold text-sm">No drift detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.drift_alerts.map(alert => (
                  <div key={alert.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-slate-800">{alert.model}</h4>
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase">
                        {alert.severity} DRIFT
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{alert.message}</p>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-mono text-slate-500">Feature: {alert.feature}</span>
                      <span className="text-xs font-bold text-slate-700">Score: {alert.drift_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelMonitor;
