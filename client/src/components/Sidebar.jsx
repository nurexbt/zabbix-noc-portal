import React from 'react';
import { 
  Activity, 
  Radio, 
  Server, 
  ShieldAlert, 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Layers,
  Network,
  Bell,
  Users
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed, 
  problemsCount,
  hostsCount,
  usersCount
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'NOC Overview',
      subtitle: 'System Health & Metrics',
      icon: Radio,
    },
    {
      id: 'hosts',
      label: 'Device / Host Inspector',
      subtitle: 'SFP Optical DDM & Graphs',
      icon: Server,
      badge: hostsCount ? `${hostsCount}` : null
    },
    {
      id: 'alerts',
      label: 'Active Problems',
      subtitle: 'Trigger Incidents',
      icon: ShieldAlert,
      badge: problemsCount > 0 ? `${problemsCount}` : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'channels',
      label: 'SMS & Telegram Alerts',
      subtitle: 'MSISDN & Telegram Setup',
      icon: Bell,
      badge: 'Active',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    },
    {
      id: 'access',
      label: 'Users & Roles',
      subtitle: 'RBAC & Credentials',
      icon: Users,
      badge: usersCount ? `${usersCount}` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    },
    {
      id: 'server',
      label: 'Server & API',
      subtitle: 'Credentials & Engine',
      icon: Cpu,
    }
  ];

  return (
    <aside 
      className={`h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/90 flex flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 shadow-lg shadow-rose-950/50 border border-rose-500/30 shrink-0">
              <Activity className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 radar-online"></div>
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-wider text-white truncate">ZABBIX NOC</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    7.0 LTS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    103.166.230.229
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition hidden sm:flex shrink-0"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-1.5">
          {!collapsed && (
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              Main Operations
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition group text-left relative ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/40 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-rose-400'}`} />

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate leading-tight">
                      {item.label}
                    </div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-rose-100/80 font-medium' : 'text-slate-500'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                )}

                {item.badge && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700')
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <a
          href="https://zabbix.teamzero.bd/"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
          title="Open Zabbix Official Web GUI"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ExternalLink className="w-4 h-4 text-rose-400 shrink-0" />
            {!collapsed && (
              <span className="text-xs font-bold truncate">Zabbix Web GUI</span>
            )}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-mono text-slate-500">:80</span>
          )}
        </a>

        {!collapsed && (
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-[10px] font-mono text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-slate-400 font-semibold">MariaDB 10.6</span>
            </div>
            <div className="flex justify-between">
              <span>Web Server:</span>
              <span className="text-slate-400 font-semibold">Nginx + PHP 8.1</span>
            </div>
            <div className="flex justify-between">
              <span>Zabbix Cache:</span>
              <span className="text-emerald-400 font-semibold">TTL 15s Active</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
