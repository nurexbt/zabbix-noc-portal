import React, { useState } from 'react';
import { 
  Server, 
  Key, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  Database, 
  ShieldCheck, 
  Radio, 
  Cpu 
} from 'lucide-react';

export default function ServerDetailsView({ connectionInfo }) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const apiToken = "eaa9ffe51fdf68bc778d4ec59fa9832068d0e1047d3e493bbab4fd8f2854baa3";
  const sshCmd = "ssh nur@103.166.230.229";

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(sshCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Installation Success Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ubuntu 22.04 LTS Zabbix Installation Active</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                All daemons (Zabbix Server, Agent2, Nginx, PHP-FPM, MariaDB) are successfully configured and active.
              </p>
            </div>
          </div>

          <a
            href="http://103.166.230.229/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition"
          >
            <span>Launch Web GUI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Grid of Credentials & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Web Access & Credentials */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Server className="w-4 h-4 text-rose-400" />
            Web Interface Access
          </h3>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">URL:</span>
              <a href="http://103.166.230.229/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                http://103.166.230.229/
              </a>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Default Username:</span>
              <span className="text-slate-100 font-bold">Admin</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Default Password:</span>
              <span className="text-slate-100 font-bold">zabbix</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Zabbix Server Version:</span>
              <span className="text-emerald-400 font-bold">7.0.31 LTS</span>
            </div>
          </div>
        </div>

        {/* Database & Linux Services */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            Database & Linux Services
          </h3>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-slate-200">MariaDB 10.6</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Database / User:</span>
              <span className="text-slate-200">zabbix / zabbix</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Database Password:</span>
              <span className="text-slate-200">ZabbixSecure2026!</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Web Daemon:</span>
              <span className="text-slate-200">Nginx + PHP 8.1 FPM</span>
            </div>
          </div>
        </div>

      </div>

      {/* API Bearer Token */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Active Permanent Zabbix API Bearer Token
          </h3>
          <span className="text-[11px] font-mono text-emerald-400">Never Expires</span>
        </div>

        <p className="text-xs text-slate-400">
          Used by the Node.js Express backend in <code className="font-mono text-slate-300">server/.env</code> to make JSON-RPC 2.0 calls.
        </p>

        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3 font-mono text-xs">
          <span className="text-amber-400/90 truncate">{apiToken}</span>
          <button
            onClick={handleCopyToken}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0"
          >
            {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedToken ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Useful Linux Commands for New Linux Admin */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Common Ubuntu Server Commands
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">Check Server Daemon</span>
            <code className="text-emerald-400">sudo systemctl status zabbix-server</code>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">Check Agent Daemon</span>
            <code className="text-emerald-400">sudo systemctl status zabbix-agent2</code>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">View Server Logs</span>
            <code className="text-cyan-400">sudo tail -f /var/log/zabbix/zabbix_server.log</code>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">Restart Web Server</span>
            <code className="text-cyan-400">sudo systemctl restart nginx php8.1-fpm</code>
          </div>
        </div>
      </div>

    </div>
  );
}
