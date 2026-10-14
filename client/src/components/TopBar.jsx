import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  Layers,
  Server,
  Key,
  LogOut,
  User,
  Shield
} from 'lucide-react';

export default function TopBar({ 
  activeTab, 
  autoRefresh, 
  setAutoRefresh, 
  onManualRefresh, 
  isRefreshing, 
  countdown,
  selectedHostName,
  currentUser,
  onOpenChangePassword,
  onLogout
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabTitles = {
    overview: { title: 'Enterprise NOC Overview', subtitle: 'Global server health, availability breakdown and trigger matrix' },
    hosts: { title: 'Device / Host Inspector', subtitle: 'Real SNMP DDM Optical Telemetry & Zabbix Custom Graphs View' },
    alerts: { title: 'Active Problem Incidents', subtitle: 'Live problem alerts and trigger events from Zabbix engine' },
    channels: { title: 'Alert Escalation & Media Channels', subtitle: 'MSISDN SMS Gateway & Telegram Bot notifications setup' },
    access: { title: 'User & Role Access Control', subtitle: 'Manage Zabbix operators, RBAC privileges, and security credentials' },
    server: { title: 'Server Engine & API Configuration', subtitle: 'Ubuntu 22.04 LTS service details, Bearer tokens and setup' }
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/90 px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 z-20">
      
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-extrabold text-white tracking-tight">
            {currentInfo.title}
          </h1>
          {activeTab === 'hosts' && selectedHostName && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
              {selectedHostName}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Clocks, Controls & User Account */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
        
        {/* Real-time clocks */}
        <div className="hidden xl:flex flex-col text-right font-mono text-[11px] text-slate-400 leading-tight">
          <span className="text-slate-300 font-bold">{time.toUTCString().slice(17, 25)} UTC</span>
          <span className="text-slate-500">{time.toLocaleTimeString()} Local</span>
        </div>

        {/* Polling & Refresh Bar */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 pl-2">Poll:</span>
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
            className="bg-slate-900 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-750 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
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

        {/* Zabbix Web GUI Button */}
        <a 
          href="https://zabbix.teamzero.bd/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          title="Open Official Zabbix GUI"
        >
          <span>Zabbix GUI</span>
          <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
        </a>

        {/* User Account Controls */}
        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1 pl-2.5 rounded-xl">
            <div className="flex items-center gap-2 pr-1">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold uppercase">
                {currentUser.username ? currentUser.username.slice(0, 2) : 'OP'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser.username}
                </div>
                <div className="text-[9px] font-mono text-slate-400 leading-none">
                  {currentUser.role?.name || 'Operator'}
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <button
              onClick={onOpenChangePassword}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition"
              title="Change Account Password"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>

    </header>
  );
}
