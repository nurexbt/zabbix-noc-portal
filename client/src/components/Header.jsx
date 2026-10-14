import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Server, 
  Radio, 
  ShieldAlert, 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  connectionStatus, 
  autoRefresh, 
  setAutoRefresh, 
  onManualRefresh, 
  isRefreshing,
  countdown
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 shadow-lg shadow-rose-950/50 border border-rose-500/30">
              <Activity className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 radar-online"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white">ZABBIX NOC</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  v7.0 LTS
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>103.166.230.229</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Online
                </span>
              </div>
            </div>
          </div>

          <a 
            href="http://103.166.230.229/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="md:hidden flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <span>Web UI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-900/40 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>NOC Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('hosts')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'hosts'
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-900/40 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Device / Host Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-900/40 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Active Problems</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'server'
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-900/40 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Server & API</span>
          </button>
        </nav>

        {/* Polling Toggle, Manual Refresh & Clock */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="hidden lg:flex flex-col text-right font-mono text-[11px] text-slate-400">
            <span>{time.toUTCString().slice(17, 25)} UTC</span>
            <span className="text-slate-500">{time.toLocaleTimeString()} Local</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/90 p-1 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 pl-2">Poll:</span>
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              className="bg-slate-800/80 text-slate-200 text-xs font-medium rounded-lg px-2 py-1.5 border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value={0}>Manual</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>

            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
              title="Refresh Data Now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
              {autoRefresh > 0 && (
                <span className="font-mono text-[10px] text-slate-400">({countdown}s)</span>
              )}
            </button>
          </div>

          <a 
            href="http://103.166.230.229/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition shadow-sm font-medium"
          >
            <span>Zabbix Web GUI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </header>
  );
}
