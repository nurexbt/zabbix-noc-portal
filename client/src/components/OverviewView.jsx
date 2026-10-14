import React from 'react';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MinusCircle, 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  Clock, 
  ArrowRight,
  Database,
  Cpu,
  Layers
} from 'lucide-react';

export default function OverviewView({ overview, onSelectHostTab, onSelectAlertsTab }) {
  const breakdown = overview?.hostsBreakdown || { total: 0, up: 0, down: 0, unreachable: 0, disabled: 0 };
  const severityCounts = overview?.severityCounts || { disaster: 0, high: 0, average: 0, warning: 0, total: 0 };
  const recentProblems = overview?.recentProblems || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner / System Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-rose-500/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 radar-online"></span>
              <h1 className="text-xl font-bold text-white tracking-tight">Enterprise NOC Monitoring Hub</h1>
            </div>
            <p className="text-xs text-slate-400">
              Live Zabbix 7.0 JSON-RPC 2.0 telemetry from <span className="font-mono text-slate-300">103.166.230.229</span> with in-memory TTL caching
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Core Engine</span>
              <span className="font-semibold text-slate-200">Zabbix Server 7.0 LTS</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Database</span>
              <span className="font-semibold text-slate-200">MariaDB 10.6 UTF8MB4</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Web Daemon</span>
              <span className="font-semibold text-slate-200">Nginx + PHP 8.1 FPM</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Host Availability Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Server className="w-4 h-4 text-rose-400" />
            Host Availability Breakdown
          </h2>
          <button 
            onClick={onSelectHostTab}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition"
          >
            <span>View All Devices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Hosts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative group hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Monitored</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{breakdown.total}</span>
              <span className="text-[11px] text-slate-400">nodes</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">All registered devices</div>
          </div>

          {/* Up / Operational */}
          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 shadow-sm relative group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">Available / Up</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">{breakdown.up}</span>
              <span className="text-[11px] text-emerald-500/80 font-mono">
                {breakdown.total > 0 ? `${Math.round((breakdown.up / breakdown.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-500/70">Zabbix Agent & ICMP OK</div>
          </div>

          {/* Down / Critical */}
          <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-4 shadow-sm relative group hover:border-rose-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-400">Down / Offline</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">{breakdown.down}</span>
              <span className="text-[11px] text-rose-400/80">nodes</span>
            </div>
            <div className="mt-2 text-[11px] text-rose-400/70">Failed health checks</div>
          </div>

          {/* Unreachable / Warning */}
          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 shadow-sm relative group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400">Unreachable</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">{breakdown.unreachable}</span>
              <span className="text-[11px] text-amber-400/80">nodes</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-400/70">Intermittent / Pending</div>
          </div>

          {/* Disabled */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative group hover:border-slate-700 transition col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Disabled</span>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                <MinusCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-400 font-mono">{breakdown.disabled}</span>
              <span className="text-[11px] text-slate-500">nodes</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">Maintenance mode</div>
          </div>
        </div>
      </div>

      {/* 2. Problem Severity Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Active Alerts by Severity (Zabbix JSON-RPC)
          </h2>
          <button 
            onClick={onSelectAlertsTab}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition"
          >
            <span>View Alerts Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Disaster (5) */}
          <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-600/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Disaster</span>
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            <div className="mt-2 text-3xl font-black text-rose-500 font-mono">{severityCounts.disaster}</div>
            <div className="mt-1 text-[11px] text-rose-400/60">Priority: Emergency (5)</div>
          </div>

          {/* High (4) */}
          <div className="bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">High</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2 text-3xl font-black text-orange-400 font-mono">{severityCounts.high}</div>
            <div className="mt-1 text-[11px] text-orange-400/60">Priority: Critical (4)</div>
          </div>

          {/* Average (3) */}
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Average</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-black text-amber-400 font-mono">{severityCounts.average}</div>
            <div className="mt-1 text-[11px] text-amber-400/60">Priority: Major (3)</div>
          </div>

          {/* Warning (2) */}
          <div className="bg-gradient-to-br from-yellow-950/30 to-slate-900 border border-yellow-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Warning</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="mt-2 text-3xl font-black text-yellow-400 font-mono">{severityCounts.warning}</div>
            <div className="mt-1 text-[11px] text-yellow-400/60">Priority: Notice (2)</div>
          </div>
        </div>
      </div>

      {/* 3. Active Problem Ticker & Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Live Problem Feed & Triggers
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active alerts fetched via <code className="font-mono text-slate-300">problem.get</code> & <code className="font-mono text-slate-300">trigger.get</code>
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            {recentProblems.length} Active Problems
          </span>
        </div>

        {recentProblems.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-semibold text-slate-200">No Active Problem Triggers</div>
            <div className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All monitored devices, interfaces, and optical links are operating within configured healthy thresholds.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Device / Host</th>
                  <th className="py-2.5 px-3">Problem Description</th>
                  <th className="py-2.5 px-3">Triggered Time</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {recentProblems.map((prob) => {
                  let badgeBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  if (prob.severity === 5) badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold';
                  else if (prob.severity === 4) badgeBg = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                  else if (prob.severity === 3) badgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                  return (
                    <tr key={prob.eventId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${badgeBg}`}>
                          {prob.severityName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                        {prob.hostName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {prob.problem}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(prob.clock * 1000).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                          {prob.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
